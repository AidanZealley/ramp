export interface Interval {
  startPower: number;
  endPower: number;
  durationSeconds: number;
}

/**
 * Format seconds as M:SS or H:MM:SS
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format power value with unit
 */
export function formatPower(
  power: number,
  powerMode: "absolute" | "percentage"
): string {
  return powerMode === "absolute"
    ? `${Math.round(power)}W`
    : `${Math.round(power)}%`;
}

/**
 * Get total workout duration in seconds
 */
export function getTotalDuration(intervals: Interval[]): number {
  return intervals.reduce((sum, i) => sum + i.durationSeconds, 0);
}

/**
 * Get weighted average power across all intervals
 */
export function getAveragePower(intervals: Interval[]): number {
  if (intervals.length === 0) return 0;
  const totalDuration = getTotalDuration(intervals);
  if (totalDuration === 0) return 0;

  const weightedSum = intervals.reduce((sum, i) => {
    const avgPower = (i.startPower + i.endPower) / 2;
    return sum + avgPower * i.durationSeconds;
  }, 0);

  return weightedSum / totalDuration;
}

/**
 * Snap a value to the nearest step
 */
export function snap(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute the maximum power for the y-axis display
 */
export function computeMaxPower(
  intervals: Interval[],
  powerMode: "absolute" | "percentage"
): number {
  if (intervals.length === 0) {
    return powerMode === "absolute" ? 300 : 150;
  }

  const maxPower = Math.max(
    ...intervals.flatMap((i) => [i.startPower, i.endPower])
  );
  const padded = maxPower * 1.25;

  if (powerMode === "absolute") {
    return Math.max(250, Math.ceil(padded / 50) * 50);
  }
  return Math.max(130, Math.ceil(padded / 10) * 10);
}

/**
 * Default intervals for a new workout
 */
export function getDefaultIntervals(): Interval[] {
  return [
    { startPower: 80, endPower: 150, durationSeconds: 300 },
    { startPower: 200, endPower: 200, durationSeconds: 300 },
    { startPower: 100, endPower: 100, durationSeconds: 120 },
    { startPower: 200, endPower: 200, durationSeconds: 300 },
    { startPower: 100, endPower: 100, durationSeconds: 120 },
    { startPower: 120, endPower: 80, durationSeconds: 180 },
  ];
}
