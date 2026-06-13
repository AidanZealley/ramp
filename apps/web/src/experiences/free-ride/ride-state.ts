/**
 * Shared, mutable motion state for the Free Ride experience.
 *
 * A single plain object is created once (via `useMemo`) in the experience view
 * and passed by prop to the scene. `RideMotion` is the *only* writer of
 * `distance`/`speed`/`bank`/`grade` each frame; the camera, ribbon and scenery
 * are all readers. Centralising this avoids the multi-component telemetry
 * sampling that made the old 3D experience jitter and pop.
 */
import { createTrackSample } from "./track"
import { getTargetDroneActor } from "./actors"
import { FREE_RIDE_TARGETS } from "./free-ride-config"
import type { FreeRideActor } from "./actors"
import type { MutableTrackSample } from "./track"
import { DEFAULT_FTP } from "@/lib/workout-utils"

export type RideState = {
  /** Authoritative travelled distance along the track (metres). */
  distance: number
  /** Current visual speed (metres/second of travel). */
  speed: number
  /** Latest trainer speed in m/s, or null when no trainer telemetry. */
  telemetrySpeedMps: number | null
  /** Latest rider power in watts, or null when no trainer telemetry. */
  telemetryPowerWatts: number | null
  /** Rider FTP used by local target-drone gameplay tuning. */
  riderFtpWatts: number
  /** Track bank (radians) at the current distance. */
  bank: number
  /** Track grade (slope) at the current distance. */
  grade: number
  /** Mutable track sample at the current distance; written once per frame. */
  trackSample: MutableTrackSample
  /** Whether a trainer is currently connected (drives speed source). */
  trainerConnected: boolean
  /** Motion-derived target drone state for local Free Ride gameplay. */
  targetDroneGapMeters: number
  targetDroneDraftLocked: boolean
  targetDrone: FreeRideActor
}

export function createRideState(): RideState {
  return {
    distance: 0,
    speed: 0,
    telemetrySpeedMps: null,
    telemetryPowerWatts: null,
    riderFtpWatts: DEFAULT_FTP,
    bank: 0,
    grade: 0,
    trackSample: createTrackSample(),
    trainerConnected: false,
    targetDroneGapMeters: FREE_RIDE_TARGETS.defaultLeadMeters,
    targetDroneDraftLocked: false,
    targetDrone: getTargetDroneActor({
      riderDistanceMeters: 0,
      gapMeters: FREE_RIDE_TARGETS.defaultLeadMeters,
    }),
  }
}
