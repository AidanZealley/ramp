import { useEffect, useRef, useState } from "react"
import {
  getCooldownStartSeconds,
  getRampPhaseAtElapsed,
  getRampStartSeconds,
  getRampStepDurationSeconds,
} from "../ramp-protocol"
import {
  averagePowerInWindow,
  calculateRampFtp,
  pruneSamples,
} from "../utils"
import type { RampPhase } from "../ramp-protocol"
import type { PowerSample } from "../utils"
import type { WorkoutSessionController } from "@ramp/ride-workouts"
import type { RideSessionController } from "@ramp/ride-core"

const POWER_WINDOW_MS = 60_000
const LOW_CADENCE_RPM = 50
const LOW_CADENCE_MS = 3_000
const LOW_POWER_FACTOR = 0.7
const LOW_POWER_MS = 5_000
/** Grace period at the start of each ramp step before failure detection arms. */
const STEP_SETTLE_SECONDS = 10

export type RampTestMonitorResult = {
  phase: RampPhase
  calculatedFtp: number | null
  failed: boolean
}

const INITIAL_RESULT: RampTestMonitorResult = {
  phase: "warmup",
  calculatedFtp: null,
  failed: false,
}

/**
 * Watches ride telemetry while the ramp test runs. During the ramp steps it
 * detects rider failure (sustained low cadence or low power versus the ERG
 * target) and jumps the workout controller to the cooldown. FTP is captured
 * from the final 60 s of actual power whenever the rider leaves the ramp —
 * either by failing or by completing every step.
 */
export function useRampTestMonitor({
  session,
  workoutController,
  active,
}: {
  session: RideSessionController
  workoutController: WorkoutSessionController | null
  active: boolean
}): RampTestMonitorResult {
  const [result, setResult] = useState<RampTestMonitorResult>(INITIAL_RESULT)

  const samplesRef = useRef<Array<PowerSample>>([])
  const capturedRef = useRef(false)
  const lowCadenceSinceRef = useRef<number | null>(null)
  const lowPowerSinceRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active || !workoutController) return

    samplesRef.current = []
    capturedRef.current = false
    lowCadenceSinceRef.current = null
    lowPowerSinceRef.current = null
    setResult(INITIAL_RESULT)

    const capture = (nowMs: number, failed: boolean) => {
      if (capturedRef.current) return
      capturedRef.current = true
      const avgWatts = averagePowerInWindow(
        samplesRef.current,
        nowMs,
        POWER_WINDOW_MS
      )
      const calculatedFtp = calculateRampFtp(avgWatts)
      setResult((previous) => ({ ...previous, calculatedFtp, failed }))
    }

    const fail = (nowMs: number) => {
      capture(nowMs, true)
      void workoutController.seekToElapsedSeconds(getCooldownStartSeconds())
    }

    const evaluate = () => {
      const nowMs = Date.now()
      const telemetry = session.getState().telemetry
      const workoutState = workoutController.getState()
      const elapsedSeconds = workoutState.elapsedSeconds

      if (telemetry.powerWatts !== null) {
        samplesRef.current.push({
          tMs: nowMs,
          powerWatts: telemetry.powerWatts,
        })
        pruneSamples(samplesRef.current, nowMs, POWER_WINDOW_MS)
      }

      const phase = getRampPhaseAtElapsed(elapsedSeconds)
      setResult((previous) =>
        previous.phase === phase ? previous : { ...previous, phase }
      )

      if (capturedRef.current) return

      // Completed every ramp step without failing.
      if (phase === "cooldown") {
        capture(nowMs, false)
        return
      }

      if (phase !== "ramp") {
        lowCadenceSinceRef.current = null
        lowPowerSinceRef.current = null
        return
      }

      const stepElapsedSeconds =
        (elapsedSeconds - getRampStartSeconds()) % getRampStepDurationSeconds()
      const armed = stepElapsedSeconds >= STEP_SETTLE_SECONDS
      if (!armed) {
        lowCadenceSinceRef.current = null
        lowPowerSinceRef.current = null
        return
      }

      const cadenceLow =
        telemetry.cadenceRpm !== null && telemetry.cadenceRpm < LOW_CADENCE_RPM
      if (cadenceLow) {
        lowCadenceSinceRef.current ??= nowMs
        if (nowMs - lowCadenceSinceRef.current >= LOW_CADENCE_MS) {
          fail(nowMs)
          return
        }
      } else {
        lowCadenceSinceRef.current = null
      }

      const targetWatts = workoutState.targetWatts
      const powerLow =
        targetWatts !== null &&
        targetWatts > 0 &&
        telemetry.powerWatts !== null &&
        telemetry.powerWatts < targetWatts * LOW_POWER_FACTOR
      if (powerLow) {
        lowPowerSinceRef.current ??= nowMs
        if (nowMs - lowPowerSinceRef.current >= LOW_POWER_MS) {
          fail(nowMs)
          return
        }
      } else {
        lowPowerSinceRef.current = null
      }
    }

    const unsubscribe = session.subscribe(evaluate)
    evaluate()
    return unsubscribe
  }, [active, session, workoutController])

  return result
}
