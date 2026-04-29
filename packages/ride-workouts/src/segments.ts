import type { WorkoutInterval, WorkoutSegment } from "./types"

export function getWorkoutSegmentAtElapsed(
  intervals: ReadonlyArray<WorkoutInterval>,
  elapsedSeconds: number,
  ftpWatts: number,
  powerMode: "percentage" | "absolute" = "percentage"
): WorkoutSegment | null {
  if (intervals.length === 0) return null

  let cursor = 0
  const elapsed = Math.max(0, elapsedSeconds)

  for (let index = 0; index < intervals.length; index += 1) {
    const interval = intervals[index]
    const duration = Math.max(0, interval.durationSeconds)
    const startSeconds = cursor
    const endSeconds = cursor + duration
    const isLast = index === intervals.length - 1

    if (elapsed < endSeconds || (isLast && elapsed === endSeconds)) {
      const targetPower =
        interval.startPower + (interval.endPower - interval.startPower) * 0.5
      return {
        index,
        startSeconds,
        endSeconds,
        targetWatts:
          powerMode === "absolute"
            ? Math.round(targetPower)
            : Math.round((targetPower * ftpWatts) / 100),
        label: interval.comment?.trim() || `Segment ${index + 1}`,
      }
    }

    cursor = endSeconds
  }

  return null
}
