import type { Interval } from "@/lib/workout-utils"

export type IntervalBounds = {
  startSeconds: number
  endSeconds: number
  durationSeconds: number
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

export function getTotalDurationSeconds(
  stateTotalDurationSeconds: number,
  intervals: Array<Interval>
): number {
  if (stateTotalDurationSeconds > 0) return stateTotalDurationSeconds
  return intervals.reduce(
    (sum, interval) => sum + Math.max(0, interval.durationSeconds),
    0
  )
}

export function getWorkoutRemainingSeconds(
  totalDurationSeconds: number,
  elapsedSeconds: number
): number {
  return Math.max(0, totalDurationSeconds - elapsedSeconds)
}

export function getIntervalBounds(
  intervals: Array<Interval>,
  activeSegmentIndex: number | null
): IntervalBounds | null {
  if (
    activeSegmentIndex === null ||
    activeSegmentIndex < 0 ||
    activeSegmentIndex >= intervals.length
  ) {
    return null
  }

  const startSeconds = intervals
    .slice(0, activeSegmentIndex)
    .reduce((sum, interval) => sum + Math.max(0, interval.durationSeconds), 0)
  const durationSeconds = Math.max(
    0,
    intervals[activeSegmentIndex]?.durationSeconds ?? 0
  )

  return {
    startSeconds,
    endSeconds: startSeconds + durationSeconds,
    durationSeconds,
  }
}

export function getIntervalRemainingSeconds(
  bounds: IntervalBounds | null,
  elapsedSeconds: number
): number {
  if (!bounds) return 0
  return Math.max(0, bounds.endSeconds - elapsedSeconds)
}

export function getIntervalProgressPercent(
  bounds: IntervalBounds | null,
  elapsedSeconds: number
): number {
  if (!bounds || bounds.durationSeconds <= 0) return 0
  return clampPercent(
    ((elapsedSeconds - bounds.startSeconds) / bounds.durationSeconds) * 100
  )
}

export function getOverallProgressPercent(
  totalDurationSeconds: number,
  elapsedSeconds: number
): number {
  if (totalDurationSeconds <= 0) return 0
  return clampPercent((elapsedSeconds / totalDurationSeconds) * 100)
}

export function getCompletedIntervalCount(
  intervals: Array<Interval>,
  elapsedSeconds: number,
  isComplete: boolean
): number {
  if (isComplete) return intervals.length

  let cumulativeSeconds = 0
  let completed = 0
  for (const interval of intervals) {
    cumulativeSeconds += Math.max(0, interval.durationSeconds)
    if (cumulativeSeconds <= elapsedSeconds) {
      completed += 1
    }
  }

  return Math.max(0, Math.min(intervals.length, completed))
}
