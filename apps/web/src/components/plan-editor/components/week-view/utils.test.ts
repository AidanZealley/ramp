import { describe, expect, it } from "vitest"
import { getDefaultSelectedDayIndex } from "./utils"
import type { PlanEditorWeek } from "../../types"
import type { Doc, Id } from "#convex/_generated/dataModel"

const workout = {
  _id: "workout-1" as Id<"workouts">,
  _creationTime: 1,
  ownerId: "user-1" as Id<"users">,
  title: "Tempo Builder",
  intervals: [{ startPower: 80, endPower: 90, durationSeconds: 600 }],
} satisfies Doc<"workouts">

function week(slots: PlanEditorWeek["slots"]): PlanEditorWeek {
  return {
    _id: "week-1" as Id<"planWeeks">,
    _creationTime: 1,
    planId: "plan-1" as Id<"plans">,
    orderIndex: 0,
    slots,
  }
}

function slot(dayIndex: number, assigned: boolean): PlanEditorWeek["slots"][number] {
  return {
    _id: `slot-${dayIndex}` as Id<"planWeekWorkouts">,
    _creationTime: 1,
    weekId: "week-1" as Id<"planWeeks">,
    dayIndex,
    workoutId: assigned ? workout._id : null,
    workout: assigned ? workout : null,
  }
}

describe("getDefaultSelectedDayIndex", () => {
  it("returns the first assigned workout day", () => {
    expect(
      getDefaultSelectedDayIndex(week([slot(4, true), slot(1, true)]))
    ).toBe(1)
  })

  it("returns Monday when all days are empty", () => {
    expect(getDefaultSelectedDayIndex(week([slot(2, false)]))).toBe(0)
  })

  it("ignores missing slots and still falls back safely", () => {
    expect(getDefaultSelectedDayIndex(week([]))).toBe(0)
  })
})
