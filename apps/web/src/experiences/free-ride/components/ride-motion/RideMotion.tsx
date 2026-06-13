import { useFrame } from "@react-three/fiber"
import { FREE_RIDE_MOTION } from "../../free-ride-config"
import {
  getNextTargetDroneGapMeters,
  getTargetDroneActor,
} from "../../actors"
import { getNextTargetDroneDraftLocked } from "../../draft-zone"
import { clamp, sampleTrackInto } from "../../track"
import type { RideState } from "../../ride-state"

type RideMotionProps = {
  rideState: RideState
}

/**
 * Headless, single writer of the shared ride-state every frame. Computes a
 * target visual speed (trainer-driven when telemetry is present, cruise
 * otherwise), eases toward it, advances `distance`, and refreshes `bank`/`grade`
 * from the analytic track. Everything else in the scene only reads.
 */
export function RideMotion({ rideState }: RideMotionProps) {
  useFrame((_, delta) => {
    // Guard against large jumps after a tab is backgrounded.
    const dt = Math.min(delta, 0.05)

    const hasTrainerSpeed =
      rideState.trainerConnected && rideState.telemetrySpeedMps !== null
    const targetSpeed = hasTrainerSpeed
      ? clamp(
          (rideState.telemetrySpeedMps ?? 0) *
            FREE_RIDE_MOTION.visualSpeedScale,
          0,
          FREE_RIDE_MOTION.maxSpeedMps
        )
      : FREE_RIDE_MOTION.cruiseSpeedMps

    const ease = 1 - Math.exp(-FREE_RIDE_MOTION.speedEaseRate * dt)
    rideState.speed += (targetSpeed - rideState.speed) * ease
    rideState.distance += rideState.speed * dt

    const sample = sampleTrackInto(rideState.distance, rideState.trackSample)
    rideState.bank = sample.bank
    rideState.grade = sample.grade
    rideState.targetDroneGapMeters = getNextTargetDroneGapMeters({
      currentGapMeters: rideState.targetDroneGapMeters,
      riderPowerWatts: rideState.telemetryPowerWatts,
      riderFtpWatts: rideState.riderFtpWatts,
      deltaSeconds: dt,
    })
    rideState.targetDroneDraftLocked = getNextTargetDroneDraftLocked({
      currentDraftLocked: rideState.targetDroneDraftLocked,
      gapMeters: rideState.targetDroneGapMeters,
    })
    rideState.targetDrone = getTargetDroneActor({
      riderDistanceMeters: rideState.distance,
      gapMeters: rideState.targetDroneGapMeters,
    })
  })

  return null
}
