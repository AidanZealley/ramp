import { getTotalDuration } from "@/lib/workout-utils"
import type {
  DurationFilter,
  PowerFilter,
  SortOption,
  WorkoutDoc,
} from "./types"

export function matchesWorkoutFilters(
  workout: WorkoutDoc,
  filters: {
    search: string
    powerFilter: PowerFilter
    durationFilter: DurationFilter
  }
) {
  if (
    filters.search &&
    !workout.title.toLowerCase().includes(filters.search)
  ) {
    return false
  }

  if (
    filters.powerFilter !== "all" &&
    workout.powerMode !== filters.powerFilter
  ) {
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

export function sortWorkouts(workouts: WorkoutDoc[], sort: SortOption) {
  return [...workouts].sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title)
    if (sort === "duration-asc") {
      return getTotalDuration(a.intervals) - getTotalDuration(b.intervals)
    }
    if (sort === "duration-desc") {
      return getTotalDuration(b.intervals) - getTotalDuration(a.intervals)
    }
    return b._creationTime - a._creationTime
  })
}
