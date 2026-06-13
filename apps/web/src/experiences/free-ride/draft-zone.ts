import { FREE_RIDE_TARGETS } from "./free-ride-config"
import { clamp } from "./track"

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

export function getTargetDroneDraftQuality(input: {
  draftLocked: boolean
  gapMeters: number
}): number {
  if (!input.draftLocked) return 0
  if (!Number.isFinite(input.gapMeters)) return 0
  if (input.gapMeters <= FREE_RIDE_TARGETS.draftQualityFullGapMeters) return 1
  if (input.gapMeters >= FREE_RIDE_TARGETS.draftQualityZeroGapMeters) return 0

  const quality =
    1 -
    (input.gapMeters - FREE_RIDE_TARGETS.draftQualityFullGapMeters) /
      (FREE_RIDE_TARGETS.draftQualityZeroGapMeters -
        FREE_RIDE_TARGETS.draftQualityFullGapMeters)

  return clamp(quality, 0, 1)
}
