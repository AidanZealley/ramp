import { FREE_RIDE_TARGETS } from "./free-ride-config"
import { clamp } from "./track"

export function getWeaponChargeActive(input: {
  draftLocked: boolean
  riderPowerWatts: number | null
  riderFtpWatts: number
}): boolean {
  if (!input.draftLocked) return false
  if (input.riderPowerWatts === null) return false
  if (!Number.isFinite(input.riderPowerWatts)) return false
  if (!Number.isFinite(input.riderFtpWatts) || input.riderFtpWatts <= 0) {
    return false
  }

  return (
    input.riderPowerWatts >=
    input.riderFtpWatts * FREE_RIDE_TARGETS.weaponChargePowerFtpRatio
  )
}

export function getNextWeaponCharge(input: {
  currentCharge: number
  chargeActive: boolean
  deltaSeconds: number
}): number {
  const currentCharge = Number.isFinite(input.currentCharge)
    ? input.currentCharge
    : 0
  const clampedCurrentCharge = clamp(currentCharge, 0, 1)

  if (!Number.isFinite(input.deltaSeconds) || input.deltaSeconds <= 0) {
    return clampedCurrentCharge
  }

  if (!input.chargeActive) return clampedCurrentCharge

  return clamp(
    clampedCurrentCharge +
      input.deltaSeconds / FREE_RIDE_TARGETS.weaponChargeFullSeconds,
    0,
    1
  )
}
