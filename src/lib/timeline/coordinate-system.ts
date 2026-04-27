import type { Interval } from "@/lib/workout-utils"

/**
 * Pure coordinate-system functions for mapping between
 * domain values (time, power) and pixel positions.
 *
 * No React dependency — these can be used anywhere.
 */

// --- Time <-> X mapping ---

export function timeToX(seconds: number, pixelsPerSecond: number): number {
  return seconds * pixelsPerSecond
}

export function xToTime(x: number, pixelsPerSecond: number): number {
  return x / pixelsPerSecond
}

// --- Power <-> Y mapping ---
// Y axis is inverted: top of the editor = max power, bottom = 0

export function powerToY(
  power: number,
  maxPower: number,
  height: number
): number {
  return height * (1 - power / maxPower)
}

export function yToPower(y: number, maxPower: number, height: number): number {
  return maxPower * (1 - y / height)
}

// --- Interval geometry ---

/**
 * Get the X pixel position where an interval starts,
 * based on the cumulative duration of all preceding intervals.
 */
export function getIntervalStartX(
  index: number,
  intervals: Interval[],
  pixelsPerSecond: number
): number {
  return intervals
    .slice(0, index)
    .reduce((sum, iv) => sum + iv.durationSeconds * pixelsPerSecond, 0)
}

/**
 * Get the pixel width of an interval.
 */
export function getIntervalWidth(
  interval: Interval,
  pixelsPerSecond: number
): number {
  return interval.durationSeconds * pixelsPerSecond
}

// --- Grid tick computation ---

/**
 * Compute power tick values for horizontal grid lines in canonical %FTP units.
 */
export function computePowerTicks(maxPower: number): number[] {
  const step = 20
  const ticks: number[] = []
  for (let p = step; p < maxPower; p += step) {
    ticks.push(p)
  }
  return ticks
}

/**
 * Compute time tick values for vertical grid lines.
 * Picks the smallest "nice" step that keeps adjacent labels at least
 * MIN_LABEL_GAP_PX pixels apart, so labels never bunch up on small screens.
 */
export function computeTimeTicks(
  totalDurationSec: number,
  pixelsPerSecond: number
): number[] {
  // Minimum pixel gap we want between adjacent tick labels (~width of "1:00:00")
  const MIN_LABEL_GAP_PX = 60
  const minStepSec =
    pixelsPerSecond > 0 ? MIN_LABEL_GAP_PX / pixelsPerSecond : 60

  // Candidate step sizes in ascending order (seconds)
  const NICE_STEPS = [30, 60, 120, 180, 300, 600, 900, 1200, 1800, 3600]
  const step =
    NICE_STEPS.find((s) => s >= minStepSec) ?? NICE_STEPS[NICE_STEPS.length - 1]

  const ticks: number[] = []
  for (let t = step; t < totalDurationSec; t += step) {
    ticks.push(t)
  }
  return ticks
}
