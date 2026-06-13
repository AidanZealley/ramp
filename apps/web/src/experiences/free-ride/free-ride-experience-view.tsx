import { useCallback, useEffect, useMemo, useRef } from "react"
import { useQuery } from "convex/react"
import { useRideFrame } from "@ramp/ride-react"
import { FreeRideScene } from "./components/free-ride-scene"
import { FreeRideHud } from "./components/free-ride-hud"
import { FREE_RIDE_ELEVATION } from "./free-ride-config"
import { createRideState } from "./ride-state"
import { clamp } from "./track"
import type { ExperienceSessionAPI } from "@/ride/experience-session"
import { api } from "#convex/_generated/api"
import { DEFAULT_FTP } from "@/lib/workout-utils"

const GRADE_DISPATCH_INTERVAL_MS = 250
const GRADE_DEADBAND_PERCENT = 0.5

/**
 * Free Ride — a first-person, Redout-style flight down a neon anti-gravity
 * track. Pure visual: it records no activity. Forward speed is trainer-driven
 * (with a cruise fallback when no trainer speed is present) and the track
 * gradient is fed back to the trainer as simulation grade.
 */
export function FreeRideExperienceView({
  session,
}: {
  session: ExperienceSessionAPI
}) {
  const rideState = useMemo(() => createRideState(), [])
  const preferences = useQuery(api.preferences.get)
  const ftp = preferences?.ftp ?? DEFAULT_FTP
  const lastGradePercent = useRef<number | null>(null)
  const lastDispatchMs = useRef(0)

  // Keep speed source live and dispatch simulation grade (throttled + deadband).
  useRideFrame(
    session,
    useCallback(
      (frame) => {
        rideState.telemetrySpeedMps = frame.telemetry?.speedMps ?? null
        rideState.telemetryPowerWatts = frame.telemetry?.powerWatts ?? null
        rideState.riderFtpWatts = ftp

        const now = Date.now()
        if (now - lastDispatchMs.current < GRADE_DISPATCH_INTERVAL_MS) return

        // Dispatch physical trainer grade only; visual height exaggeration is
        // applied by rendering helpers and never feeds the trainer.
        const gradePercent = clamp(
          rideState.grade * 100,
          -FREE_RIDE_ELEVATION.maxTrainerGradePercent,
          FREE_RIDE_ELEVATION.maxTrainerGradePercent
        )
        if (
          lastGradePercent.current === null ||
          Math.abs(gradePercent - lastGradePercent.current) >= GRADE_DEADBAND_PERCENT
        ) {
          lastGradePercent.current = gradePercent
          lastDispatchMs.current = now
          void session.controls.dispatch(
            { type: "setSimulationGrade", gradePercent },
            "experience"
          )
        }
      },
      [session, rideState, ftp]
    )
  )

  // Track trainer connection so motion can fall back to cruise when idle.
  useEffect(() => {
    const update = () => {
      rideState.trainerConnected = session.getState().trainerConnected
    }
    update()
    return session.subscribe(update)
  }, [session, rideState])

  return (
    <div className="relative h-full w-full">
      <FreeRideScene rideState={rideState} />
      <FreeRideHud session={session} rideState={rideState} />
    </div>
  )
}
