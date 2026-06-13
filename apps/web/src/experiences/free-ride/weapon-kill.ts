import { clamp } from "./track"

export function getWeaponFireTriggered(input: {
  weaponCharge: number
  targetDroneAlive: boolean
  weaponFiring: boolean
  respawnSecondsRemaining: number
}): boolean {
  if (!input.targetDroneAlive) return false
  if (input.weaponFiring) return false
  if (!Number.isFinite(input.weaponCharge) || input.weaponCharge < 1) {
    return false
  }
  if (
    !Number.isFinite(input.respawnSecondsRemaining) ||
    input.respawnSecondsRemaining > 0
  ) {
    return false
  }

  return true
}

export function getNextCountdownSeconds(input: {
  currentSeconds: number
  deltaSeconds: number
}): number {
  if (!Number.isFinite(input.currentSeconds)) return 0
  const currentSeconds = Math.max(0, input.currentSeconds)
  if (!Number.isFinite(input.deltaSeconds) || input.deltaSeconds <= 0) {
    return currentSeconds
  }

  return Math.max(0, currentSeconds - input.deltaSeconds)
}

export function getWeaponFireProgress(input: {
  fireSecondsRemaining: number
  fireSecondsTotal: number
}): number {
  if (!Number.isFinite(input.fireSecondsTotal) || input.fireSecondsTotal <= 0) {
    return 1
  }
  if (!Number.isFinite(input.fireSecondsRemaining)) return 1

  return clamp(
    1 - input.fireSecondsRemaining / input.fireSecondsTotal,
    0,
    1
  )
}
