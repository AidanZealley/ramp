export interface Interval {
  startPower: number
  endPower: number
  durationSeconds: number
}

export type PowerDisplayMode = "absolute" | "percentage"
export type WorkoutZone = 1 | 2 | 3 | 4 | 5 | 6

export interface WorkoutStats {
  totalDurationSeconds: number
  averagePower: number
  normalizedPower: number
  intensityFactor: number
  stressScore: number
  zoneDurations: Record<WorkoutZone, number>
  zonePercentages: Record<WorkoutZone, number>
}

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

function getZoneForPercentage(ftpPercentage: number): WorkoutZone {
  if (ftpPercentage < 60) return 1
  if (ftpPercentage <= 75) return 2
  if (ftpPercentage <= 89) return 3
  if (ftpPercentage <= 104) return 4
  if (ftpPercentage <= 118) return 5
  return 6
}

function getPerSecondPowerSamples(intervals: Interval[]): number[] {
  const samples: number[] = []

  for (const interval of intervals) {
    const duration = Math.max(0, Math.round(interval.durationSeconds))
    if (duration === 0) continue

    for (let second = 0; second < duration; second += 1) {
      const progress = (second + 0.5) / duration
      const power =
        interval.startPower +
        (interval.endPower - interval.startPower) * progress
      samples.push(power)
    }
  }

  return samples
}

export function getWorkoutStats(intervals: Interval[]): WorkoutStats {
  const totalDurationSeconds = getTotalDuration(intervals)
  const averagePower = getAveragePower(intervals)
  const zoneDurations: Record<WorkoutZone, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  }

  if (totalDurationSeconds === 0) {
    return {
      totalDurationSeconds: 0,
      averagePower: 0,
      normalizedPower: 0,
      intensityFactor: 0,
      stressScore: 0,
      zoneDurations,
      zonePercentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    }
  }

  const powerSamples = getPerSecondPowerSamples(intervals)
  let rollingSum = 0
  let rollingFourthPowerSum = 0

  for (let index = 0; index < powerSamples.length; index += 1) {
    rollingSum += powerSamples[index]

    if (index >= 30) {
      rollingSum -= powerSamples[index - 30]
    }

    const windowSize = Math.min(index + 1, 30)
    const rollingAverage = rollingSum / windowSize
    rollingFourthPowerSum += rollingAverage ** 4

    const zone = getZoneForPercentage(powerSamples[index])
    zoneDurations[zone] += 1
  }

  const normalizedPower =
    powerSamples.length > 0
      ? (rollingFourthPowerSum / powerSamples.length) ** 0.25
      : 0
  const intensityFactor = normalizedPower / 100
  const stressScore =
    (totalDurationSeconds * normalizedPower * intensityFactor) / 3600

  const zonePercentages: Record<WorkoutZone, number> = {
    1: (zoneDurations[1] / totalDurationSeconds) * 100,
    2: (zoneDurations[2] / totalDurationSeconds) * 100,
    3: (zoneDurations[3] / totalDurationSeconds) * 100,
    4: (zoneDurations[4] / totalDurationSeconds) * 100,
    5: (zoneDurations[5] / totalDurationSeconds) * 100,
    6: (zoneDurations[6] / totalDurationSeconds) * 100,
  }

  return {
    totalDurationSeconds,
    averagePower,
    normalizedPower,
    intensityFactor,
    stressScore,
    zoneDurations,
    zonePercentages,
  }
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
export function computeMaxPower(intervals: Interval[]): number {
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
