import { useCallback, useRef } from "react"
import { useRideFrame } from "@ramp/ride-core"
import { sampleRouteAtDistance } from "./procgen/generate"
import { RideScene } from "./components/ride-scene"
import { RIDE_WORLD } from "./world-config"
import type { RideSessionController } from "@ramp/ride-core"

const GRADE_DEADBAND = 0.005 // 0.5%
const MIN_DISPATCH_INTERVAL_MS = 250

export function CountrysideExperienceView({
  session,
}: {
  session: RideSessionController
}) {
  const lastDispatchedGrade = useRef<number | null>(null)
  const lastDispatchTimeMs = useRef(0)

  useRideFrame(
    session,
    useCallback(
      (frame) => {
        const now = Date.now()
        if (now - lastDispatchTimeMs.current < MIN_DISPATCH_INTERVAL_MS) return

        const sample = sampleRouteAtDistance(RIDE_WORLD, frame.distanceMeters)
        const grade = sample.grade

        if (
          lastDispatchedGrade.current === null ||
          Math.abs(grade - lastDispatchedGrade.current) >= GRADE_DEADBAND
        ) {
          lastDispatchedGrade.current = grade
          lastDispatchTimeMs.current = now
          void session.controls.dispatch(
            { type: "setSimulationGrade", gradePercent: grade * 100 },
            "experience"
          )
        }
      },
      [session]
    )
  )

  return <RideScene session={session} />
}
