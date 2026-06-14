import { DAYS_PER_WEEK, WEEKDAYS, WEEKDAY_SHORT } from "../../constants"
import type { PlanEditorSlot, PlanEditorWeek } from "../../types"
import type { WeekTotals } from "./types"
import type { Id } from "#convex/_generated/dataModel"
import { getWorkoutDisplayMetrics } from "@/lib/workout-metrics"

/**
 * Day-label resolution lives here so a future "active plan with real dates"
 * can swap a single resolver without touching the cards, drawer, or footer.
 */
export function getDayShortLabel(dayIndex: number): string {
  return WEEKDAY_SHORT[dayIndex] ?? ""
}

export function getDayFullLabel(dayIndex: number): string {
  return WEEKDAYS[dayIndex] ?? ""
}

/** Normalize a week into a length-7 array of slots indexed by dayIndex. */
export function getDaySlots(week: PlanEditorWeek): Array<PlanEditorSlot> {
  const byDay = new Map(week.slots.map((slot) => [slot.dayIndex, slot]))
  return Array.from({ length: DAYS_PER_WEEK }, (_, dayIndex) => {
    const slot = byDay.get(dayIndex)
    if (slot) return slot
    return {
      _id: `missing:${dayIndex}` as Id<"planWeekWorkouts">,
      _creationTime: 0,
      weekId: week._id,
      dayIndex,
      workoutId: null,
      workout: null,
    }
  })
}

export function getDefaultSelectedDayIndex(week: PlanEditorWeek): number {
  const firstWorkoutSlot = getDaySlots(week).find((slot) => slot.workout !== null)
  return firstWorkoutSlot?.dayIndex ?? 0
}

export function computeWeekTotals(week: PlanEditorWeek): WeekTotals {
  const perDayStressScore = Array<number>(DAYS_PER_WEEK).fill(0)
  let totalDurationSeconds = 0
  let totalStressScore = 0
  let workoutCount = 0

  for (const slot of week.slots) {
    if (!slot.workout) continue
    const metrics = getWorkoutDisplayMetrics(slot.workout.intervals)
    if (slot.dayIndex >= 0 && slot.dayIndex < DAYS_PER_WEEK) {
      perDayStressScore[slot.dayIndex] = metrics.stressScore
    }
    totalDurationSeconds += metrics.totalDurationSeconds
    totalStressScore += metrics.stressScore
    workoutCount += 1
  }

  return {
    totalDurationSeconds,
    totalStressScore,
    workoutCount,
    perDayStressScore,
  }
}
