import type { ExperienceSessionAPI } from "@/ride/experience-session"
import type { RideState } from "../../ride-state"

export type FreeRideHudProps = {
  session: ExperienceSessionAPI
  rideState: RideState
}

/**
 * Derived, render-ready view model produced by `useFreeRideHudData`. Components
 * stay presentational — all telemetry reads, FTP scaling and formatting happen
 * in the hook.
 */
export type FreeRideHudViewModel = {
  /** Raw power in watts, or null when telemetry is missing. */
  powerWatts: number | null
  /** Power as a fraction (0–1) of the 3×FTP full-scale, clamped. */
  powerFill: number
  /** Zone colour for the current power (oklch string from ZONE_MAP). */
  powerColor: string
  /** True while the target drone is inside the local draft lock hysteresis. */
  draftLocked: boolean
  /** Draft quality as a fraction (0-1), sampled from the motion loop. */
  draftQuality: number
  /** Draft quality as a whole percentage. */
  draftQualityPercent: number
  /** Local weapon charge as a fraction (0-1), sampled from the motion loop. */
  weaponCharge: number
  /** Weapon charge as a whole percentage. */
  weaponChargePercent: number
  /** True while draft lock and power threshold conditions are met. */
  weaponChargeActive: boolean
  /** Current HUD intensity colour, draft colour while locked. */
  hudIntensityColor: string
  /** True when power exceeds the full-scale (arc pinned full + flashing). */
  overScale: boolean
  cadenceRpm: number | null
  /** Cadence as a fraction (0–1) of a nominal max for the pod arc. */
  cadenceFill: number
  heartRateBpm: number | null
  /** Heart rate as a fraction (0–1) of a nominal max for the pod arc. */
  heartRateFill: number
  /** Formatted speed with unit (e.g. "48.7 KM/H" parts split out). */
  speedValue: string
  speedUnit: string
  /** Formatted distance with unit. */
  distanceValue: string
  /** Formatted elapsed time (M:SS or H:MM:SS). */
  timeValue: string
  /** Signed grade percent (e.g. "+2.1"). */
  gradeValue: string
}
