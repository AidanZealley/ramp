import { FREE_RIDE_TARGETS } from "./free-ride-config"

export function getNextTargetDroneDraftLocked(input: {
  currentDraftLocked: boolean
  gapMeters: number
}): boolean {
  if (!Number.isFinite(input.gapMeters)) {
    return false
  }

  if (!input.currentDraftLocked) {
    return input.gapMeters <= FREE_RIDE_TARGETS.draftLockGapMeters
  }

  return input.gapMeters <= FREE_RIDE_TARGETS.draftUnlockGapMeters
}
