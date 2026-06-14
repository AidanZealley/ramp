import type { DurationFilter, WorkoutDoc } from "./types"
import { getTotalDuration } from "@/lib/workout-utils"

export function matchesWorkoutFilters(
  workout: WorkoutDoc,
  filters: {
    search: string
    durationFilter: DurationFilter
  }
) {
  if (filters.search && !workout.title.toLowerCase().includes(filters.search)) {
    return false
  }

  const durationSeconds = getTotalDuration(workout.intervals)
  if (filters.durationFilter === "short") return durationSeconds < 30 * 60
  if (filters.durationFilter === "medium") {
    return durationSeconds >= 30 * 60 && durationSeconds <= 60 * 60
  }
  if (filters.durationFilter === "long") return durationSeconds > 60 * 60

  return true
}

export function sortByRecent(workouts: Array<WorkoutDoc>): Array<WorkoutDoc> {
  return [...workouts].sort((a, b) => b._creationTime - a._creationTime)
}

export function getRecentWorkouts(
  workouts: Array<WorkoutDoc>,
  limit: number
): Array<WorkoutDoc> {
  return sortByRecent(workouts).slice(0, limit)
}
