/**
 * Shared, mutable motion state for the Free Ride experience.
 *
 * A single plain object is created once (via `useMemo`) in the experience view
 * and passed by prop to the scene. `RideMotion` is the *only* writer of
 * `distance`/`speed`/`bank`/`grade` each frame; the camera, ribbon and scenery
 * are all readers. Centralising this avoids the multi-component telemetry
 * sampling that made the old 3D experience jitter and pop.
 */
export type RideState = {
  /** Authoritative travelled distance along the track (metres). */
  distance: number
  /** Current visual speed (metres/second of travel). */
  speed: number
  /** Latest trainer speed in m/s, or null when no trainer telemetry. */
  telemetrySpeedMps: number | null
  /** Track bank (radians) at the current distance. */
  bank: number
  /** Track grade (slope) at the current distance. */
  grade: number
  /** Whether a trainer is currently connected (drives speed source). */
  trainerConnected: boolean
}

export function createRideState(): RideState {
  return {
    distance: 0,
    speed: 0,
    telemetrySpeedMps: null,
    bank: 0,
    grade: 0,
    trainerConnected: false,
  }
}
