/** Zwift-style ramp test FTP factor: 75% of the best one-minute power. */
export const RAMP_FTP_FACTOR = 0.75

export type PowerSample = {
  tMs: number
  powerWatts: number
}

/**
 * Compute FTP from the average actual power over the final minute of the ramp.
 * Returns an integer (clamped to >= 0) or `null` when there is no input power.
 */
export function calculateRampFtp(last60sAvgWatts: number | null): number | null {
  if (last60sAvgWatts === null || !Number.isFinite(last60sAvgWatts)) {
    return null
  }
  return Math.max(0, Math.round(last60sAvgWatts * RAMP_FTP_FACTOR))
}

/** Average the power samples whose timestamp falls within `windowMs` of `nowMs`. */
export function averagePowerInWindow(
  samples: ReadonlyArray<PowerSample>,
  nowMs: number,
  windowMs: number
): number | null {
  let total = 0
  let count = 0
  for (const sample of samples) {
    if (nowMs - sample.tMs > windowMs) continue
    if (!Number.isFinite(sample.powerWatts)) continue
    total += sample.powerWatts
    count += 1
  }
  if (count === 0) return null
  return total / count
}

/** Drop samples older than `windowMs` relative to `nowMs` (in place). */
export function pruneSamples(
  samples: Array<PowerSample>,
  nowMs: number,
  windowMs: number
): void {
  while (samples.length > 0 && nowMs - samples[0].tMs > windowMs) {
    samples.shift()
  }
}
