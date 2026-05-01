import { useEffect } from "react"
import {  useRideSession } from "@ramp/ride-core"
import { sampleRouteAtDistance } from "./procgen/generate"
import { RideScene } from "./components/ride-scene"
import { RIDE_WORLD } from "./world-config"
import type {RideSessionController} from "@ramp/ride-core";

export function CountrysideExperienceView({
  session,
}: {
  session: RideSessionController
}) {
  const state = useRideSession(session)
  const distanceMeters = state.telemetry.distanceMeters

  useEffect(() => {
    const sample = sampleRouteAtDistance(RIDE_WORLD, distanceMeters)
    void session.controls.dispatch(
      { type: "setSimulationGrade", gradePercent: sample.grade * 100 },
      "experience"
    )
  }, [distanceMeters, session])

  return <RideScene telemetry={state.telemetry} />
}
