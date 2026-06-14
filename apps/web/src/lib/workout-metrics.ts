import type { Interval, WorkoutStats, WorkoutZone } from "@/lib/workout-utils"
import type { ZoneInfo } from "@/lib/zones"
import { formatDuration, getWorkoutStats } from "@/lib/workout-utils"
import { getZoneInfoByZone } from "@/lib/zones"

const WORKOUT_ZONES: ReadonlyArray<WorkoutZone> = [1, 2, 3, 4, 5, 6]

/**
 * Derive the dominant power zone from per-zone durations. Ties resolve to the
 * lower zone. Falls back to zone 1 when no time has been logged.
 */
export function getPrimaryZone(
  zoneDurations: Record<WorkoutZone, number>
): WorkoutZone {
  let primaryZone: WorkoutZone = 1
  let maxDuration = -1

  for (const zone of WORKOUT_ZONES) {
    if (zoneDurations[zone] > maxDuration) {
      maxDuration = zoneDurations[zone]
      primaryZone = zone
    }
  }

  return primaryZone
}

export interface WorkoutDisplayMetrics {
  stats: WorkoutStats
  totalDurationSeconds: number
  durationLabel: string
  stressScore: number
  intensityFactor: number
  primaryZone: WorkoutZone
  zoneInfo: ZoneInfo
  zoneLabel: string
}

/**
 * Single source of computed, display-ready workout metrics so the day card,
 * drawer row, and week footer all show consistent numbers. Memoize per workout
 * id at the call site.
 */
export function getWorkoutDisplayMetrics(
  intervals: Array<Interval>
): WorkoutDisplayMetrics {
  const stats = getWorkoutStats(intervals)
  const primaryZone = getPrimaryZone(stats.zoneDurations)
  const zoneInfo = getZoneInfoByZone(primaryZone)

  return {
    stats,
    totalDurationSeconds: stats.totalDurationSeconds,
    durationLabel: formatDuration(stats.totalDurationSeconds),
    stressScore: Math.round(stats.stressScore),
    intensityFactor: stats.intensityFactor,
    primaryZone,
    zoneInfo,
    zoneLabel: `Z${primaryZone}`,
  }
}
