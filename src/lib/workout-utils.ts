export interface Interval {
  startPower: number
  endPower: number
  durationSeconds: number
}

export type PowerDisplayMode = "absolute" | "percentage"

export const DEFAULT_FTP = 150

/**
 * Format seconds as M:SS or H:MM:SS
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }
  return `${m}:${s.toString().padStart(2, "0")}`
}

/**
 * Format power value with unit
 */
export function formatPower(
  power: number,
  displayMode: PowerDisplayMode,
  ftp: number
): string {
  return displayMode === "absolute"
    ? `${percentageToWatts(power, ftp)}W`
    : `${Math.round(power)}%`
}

export function percentageToWatts(power: number, ftp: number): number {
  return Math.round((power * ftp) / 100)
}

export function wattsToPercentage(power: number, ftp: number): number {
  return Math.round((power / Math.max(ftp, 1)) * 100)
}

/**
 * Get total workout duration in seconds
 */
export function getTotalDuration(intervals: Interval[]): number {
  return intervals.reduce((sum, i) => sum + i.durationSeconds, 0)
}

/**
 * Get weighted average power across all intervals
 */
export function getAveragePower(intervals: Interval[]): number {
  if (intervals.length === 0) return 0
  const totalDuration = getTotalDuration(intervals)
  if (totalDuration === 0) return 0

  const weightedSum = intervals.reduce((sum, i) => {
    const avgPower = (i.startPower + i.endPower) / 2
    return sum + avgPower * i.durationSeconds
  }, 0)

  return weightedSum / totalDuration
}

/**
 * Snap a value to the nearest step
 */
export function snap(value: number, step: number): number {
  return Math.round(value / step) * step
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Compute the maximum power for the y-axis display
 */
export function computeMaxPower(
  intervals: Interval[]
): number {
  if (intervals.length === 0) {
    return 150
  }

  const maxPower = Math.max(
    ...intervals.flatMap((i) => [i.startPower, i.endPower])
  )
  const padded = maxPower * 1.25

  return Math.max(130, Math.ceil(padded / 10) * 10)
}

/**
 * Default intervals for a new workout
 */
export function getDefaultIntervals(): Interval[] {
  return [
    { startPower: 55, endPower: 75, durationSeconds: 300 },
    { startPower: 100, endPower: 100, durationSeconds: 300 },
    { startPower: 60, endPower: 60, durationSeconds: 120 },
    { startPower: 100, endPower: 100, durationSeconds: 300 },
    { startPower: 60, endPower: 60, durationSeconds: 120 },
    { startPower: 80, endPower: 55, durationSeconds: 180 },
  ]
}
