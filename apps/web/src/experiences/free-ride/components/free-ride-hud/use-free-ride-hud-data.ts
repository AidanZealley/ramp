import { useEffect, useState } from "react"
import { useQuery } from "convex/react"
import { useRideThrottledSelector } from "@ramp/ride-react"
import { FREE_RIDE_TARGETS } from "../../free-ride-config"
import { clamp01 } from "./utils"
import type { FreeRideHudViewModel } from "./types"
import type { RideSessionController } from "@ramp/ride-core"
import type { RideState } from "../../ride-state"
import { api } from "#convex/_generated/api"
import { DEFAULT_FTP } from "@/lib/workout-utils"
import { getZoneColor } from "@/lib/zones"
import { useUnitFormatters } from "@/hooks/use-unit-formatters"

const TELEMETRY_HZ = 5
const GRADE_REFRESH_HZ = 5
/** Power full-scale = this multiple of FTP. */
const POWER_FTP_MULTIPLE = 3
/** Nominal arc maxes for the side pods (cosmetic — pods are not zone-scaled). */
const CADENCE_MAX_RPM = 130
const HEART_RATE_MAX_BPM = 200

/** Split a "value unit" formatter string into parts, unit upper-cased. */
function splitValueUnit(formatted: string): { value: string; unit: string } {
  const index = formatted.lastIndexOf(" ")
  if (index === -1) return { value: formatted, unit: "" }
  return {
    value: formatted.slice(0, index),
    unit: formatted.slice(index + 1).toUpperCase(),
  }
}

/**
 * Reads live telemetry, FTP and track grade, and derives the render-ready view
 * model for the HUD. `rideState.grade` is mutated outside React each frame, so
 * it is sampled via a throttled rAF loop rather than a subscription.
 */
export function useFreeRideHudData(
  session: RideSessionController,
  rideState: RideState
): FreeRideHudViewModel {
  const telemetry = useRideThrottledSelector(session, (s) => s.telemetry, {
    hz: TELEMETRY_HZ,
  })
  const preferences = useQuery(api.preferences.get)
  const ftp = preferences?.ftp ?? DEFAULT_FTP
  const units = useUnitFormatters()

  const [gradePercent, setGradePercent] = useState(0)
  const [draftLocked, setDraftLocked] = useState(false)
  const [draftQuality, setDraftQuality] = useState(0)
  const [weaponCharge, setWeaponCharge] = useState(0)
  const [weaponChargeActive, setWeaponChargeActive] = useState(false)
  const [targetDroneAlive, setTargetDroneAlive] = useState(true)
  const [weaponFiring, setWeaponFiring] = useState(false)
  const [weaponKillBoomActive, setWeaponKillBoomActive] = useState(false)
  useEffect(() => {
    let raf = 0
    let last = 0
    const intervalMs = 1000 / GRADE_REFRESH_HZ
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (now - last < intervalMs) return
      last = now
      const next = rideState.grade * 100
      setGradePercent((prev) => (Math.abs(next - prev) < 0.05 ? prev : next))
      setDraftLocked((prev) =>
        prev === rideState.targetDroneDraftLocked
          ? prev
          : rideState.targetDroneDraftLocked
      )
      setDraftQuality((prev) =>
        Math.abs(prev - rideState.targetDroneDraftQuality) < 0.025
          ? prev
          : rideState.targetDroneDraftQuality
      )
      setWeaponCharge((prev) =>
        Math.abs(prev - rideState.weaponCharge) < 0.01
          ? prev
          : rideState.weaponCharge
      )
      setWeaponChargeActive((prev) =>
        prev === rideState.weaponChargeActive
          ? prev
          : rideState.weaponChargeActive
      )
      setTargetDroneAlive((prev) =>
        prev === rideState.targetDroneAlive ? prev : rideState.targetDroneAlive
      )
      setWeaponFiring((prev) =>
        prev === rideState.weaponFiring ? prev : rideState.weaponFiring
      )
      const nextWeaponKillBoomActive =
        rideState.weaponKillBoomSecondsRemaining > 0
      setWeaponKillBoomActive((prev) =>
        prev === nextWeaponKillBoomActive ? prev : nextWeaponKillBoomActive
      )
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [rideState])

  const power = telemetry.powerWatts
  const fullScaleWatts = ftp * POWER_FTP_MULTIPLE
  const percentOfFtp = power !== null && ftp > 0 ? (power / ftp) * 100 : 0
  const speed = splitValueUnit(units.speedMps(telemetry.speedMps))
  const powerColor = getZoneColor(percentOfFtp)

  return {
    powerWatts: power,
    powerFill: power !== null ? clamp01(power / fullScaleWatts) : 0,
    powerColor,
    draftLocked,
    draftQuality,
    draftQualityPercent: Math.round(draftQuality * 100),
    weaponCharge,
    weaponChargePercent: Math.round(weaponCharge * 100),
    weaponChargeActive,
    targetDroneAlive,
    weaponFiring,
    weaponKillBoomActive,
    hudIntensityColor: draftLocked
      ? FREE_RIDE_TARGETS.draftHudColor
      : powerColor,
    overScale: power !== null && power > fullScaleWatts,
    cadenceRpm: telemetry.cadenceRpm,
    cadenceFill:
      telemetry.cadenceRpm !== null
        ? clamp01(telemetry.cadenceRpm / CADENCE_MAX_RPM)
        : 0,
    heartRateBpm: telemetry.heartRateBpm,
    heartRateFill:
      telemetry.heartRateBpm !== null
        ? clamp01(telemetry.heartRateBpm / HEART_RATE_MAX_BPM)
        : 0,
    speedValue: speed.value,
    speedUnit: speed.unit,
    distanceValue: units.distance(telemetry.distanceMeters).toUpperCase(),
    timeValue: formatHudTime(telemetry.elapsedSeconds),
    gradeValue: `${gradePercent >= 0 ? "+" : ""}${gradePercent.toFixed(1)}`,
  }
}

/** M:SS or H:MM:SS, matching the reference HUD's compact clock. */
function formatHudTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}
