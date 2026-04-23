import type { Interval } from "@/lib/workout-utils";

/**
 * Pure coordinate-system functions for mapping between
 * domain values (time, power) and pixel positions.
 *
 * No React dependency — these can be used anywhere.
 */

// --- Time <-> X mapping ---

export function timeToX(seconds: number, pixelsPerSecond: number): number {
  return seconds * pixelsPerSecond;
}

export function xToTime(x: number, pixelsPerSecond: number): number {
  return x / pixelsPerSecond;
}

// --- Power <-> Y mapping ---
// Y axis is inverted: top of the editor = max power, bottom = 0

export function powerToY(
  power: number,
  maxPower: number,
  height: number
): number {
  return height * (1 - power / maxPower);
}

export function yToPower(
  y: number,
  maxPower: number,
  height: number
): number {
  return maxPower * (1 - y / height);
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
    .reduce((sum, iv) => sum + iv.durationSeconds * pixelsPerSecond, 0);
}

/**
 * Get the pixel width of an interval.
 */
export function getIntervalWidth(
  interval: Interval,
  pixelsPerSecond: number
): number {
  return interval.durationSeconds * pixelsPerSecond;
}

// --- Grid tick computation ---

/**
 * Compute power tick values for horizontal grid lines.
 * Absolute mode: every 50W. Percentage mode: every 20%.
 */
export function computePowerTicks(
  maxPower: number,
  powerMode: "absolute" | "percentage"
): number[] {
  const step = powerMode === "absolute" ? 50 : 20;
  const ticks: number[] = [];
  for (let p = step; p < maxPower; p += step) {
    ticks.push(p);
  }
  return ticks;
}

/**
 * Compute time tick values for vertical grid lines.
 * Short workouts (<=30min): every 60s. Longer: every 300s.
 */
export function computeTimeTicks(totalDurationSec: number): number[] {
  const step = totalDurationSec > 1800 ? 300 : 60;
  const ticks: number[] = [];
  for (let t = step; t < totalDurationSec; t += step) {
    ticks.push(t);
  }
  return ticks;
}
