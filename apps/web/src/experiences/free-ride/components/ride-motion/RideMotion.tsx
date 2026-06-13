import { useFrame } from "@react-three/fiber"
import { FREE_RIDE_MOTION, FREE_RIDE_TARGETS } from "../../free-ride-config"
import {
  getNextTargetDroneGapMeters,
  getTargetDroneActor,
} from "../../actors"
import {
  getNextTargetDroneDraftLocked,
  getTargetDroneDraftQuality,
} from "../../draft-zone"
import { clamp, sampleTrackInto } from "../../track"
import {
  getNextWeaponCharge,
  getWeaponChargeActive,
} from "../../weapon-charge"
import {
  getNextCountdownSeconds,
  getWeaponFireTriggered,
} from "../../weapon-kill"
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
    rideState.weaponKillBoomSecondsRemaining = getNextCountdownSeconds({
      currentSeconds: rideState.weaponKillBoomSecondsRemaining,
      deltaSeconds: dt,
    })

    if (rideState.weaponFiring) {
      rideState.weaponFireSecondsRemaining = getNextCountdownSeconds({
        currentSeconds: rideState.weaponFireSecondsRemaining,
        deltaSeconds: dt,
      })
      rideState.weaponChargeActive = false
      rideState.targetDrone = getTargetDroneActor({
        riderDistanceMeters: rideState.distance,
        gapMeters: rideState.targetDroneGapMeters,
        visible: true,
      })
      rideState.weaponFireTargetDistance = rideState.targetDrone.distance
      rideState.weaponFireTargetLateralOffsetMeters =
        rideState.targetDrone.lateralOffsetMeters

      if (rideState.weaponFireSecondsRemaining <= 0) {
        rideState.weaponFiring = false
        rideState.targetDroneAlive = false
        rideState.targetDroneRespawnSecondsRemaining =
          FREE_RIDE_TARGETS.weaponKillVanishSeconds
        rideState.weaponKillBoomSecondsRemaining =
          FREE_RIDE_TARGETS.weaponKillBoomSeconds
        rideState.weaponKillSequence += 1
        rideState.targetDroneDraftLocked = false
        rideState.targetDroneDraftQuality = 0
        rideState.targetDrone = getTargetDroneActor({
          riderDistanceMeters: rideState.distance,
          gapMeters: rideState.targetDroneGapMeters,
          visible: false,
        })
      }
      return
    }

    if (!rideState.targetDroneAlive) {
      rideState.targetDroneRespawnSecondsRemaining = getNextCountdownSeconds({
        currentSeconds: rideState.targetDroneRespawnSecondsRemaining,
        deltaSeconds: dt,
      })
      rideState.weaponChargeActive = false
      rideState.weaponCharge = 0

      if (rideState.targetDroneRespawnSecondsRemaining <= 0) {
        rideState.targetDroneAlive = true
        rideState.targetDroneGapMeters = FREE_RIDE_TARGETS.defaultLeadMeters
        rideState.targetDroneDraftLocked = false
        rideState.targetDroneDraftQuality = 0
      }

      rideState.targetDrone = getTargetDroneActor({
        riderDistanceMeters: rideState.distance,
        gapMeters: rideState.targetDroneGapMeters,
        visible: rideState.targetDroneAlive,
      })
      return
    }

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
    rideState.targetDroneDraftQuality = getTargetDroneDraftQuality({
      draftLocked: rideState.targetDroneDraftLocked,
      gapMeters: rideState.targetDroneGapMeters,
    })
    rideState.weaponChargeActive = getWeaponChargeActive({
      draftLocked: rideState.targetDroneDraftLocked,
      riderPowerWatts: rideState.telemetryPowerWatts,
      riderFtpWatts: rideState.riderFtpWatts,
    })
    rideState.weaponCharge = getNextWeaponCharge({
      currentCharge: rideState.weaponCharge,
      chargeActive: rideState.weaponChargeActive,
      deltaSeconds: dt,
    })
    rideState.targetDrone = getTargetDroneActor({
      riderDistanceMeters: rideState.distance,
      gapMeters: rideState.targetDroneGapMeters,
      visible: rideState.targetDroneAlive,
    })
    if (
      getWeaponFireTriggered({
        weaponCharge: rideState.weaponCharge,
        targetDroneAlive: rideState.targetDroneAlive,
        weaponFiring: rideState.weaponFiring,
        respawnSecondsRemaining: rideState.targetDroneRespawnSecondsRemaining,
      })
    ) {
      rideState.weaponFiring = true
      rideState.weaponFireSecondsRemaining = FREE_RIDE_TARGETS.weaponFireSeconds
      rideState.weaponFireSequence += 1
      rideState.weaponFireOriginDistance =
        rideState.distance - FREE_RIDE_TARGETS.weaponShotOriginBehindMeters
      rideState.weaponFireTargetDistance =
        rideState.distance + rideState.targetDroneGapMeters
      rideState.weaponFireTargetLateralOffsetMeters =
        rideState.targetDrone.lateralOffsetMeters
      rideState.weaponCharge = 0
      rideState.weaponChargeActive = false
    }
  })

  return null
}
