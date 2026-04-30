import { describe, expect, it } from "vitest"
import { toWorkoutDefinition } from "./convex-workout-mapper"
import type { Id } from "#convex/_generated/dataModel"

describe("toWorkoutDefinition", () => {
  it("maps sanitized Convex workouts as percentage definitions", () => {
    expect(
      toWorkoutDefinition({
        _id: "w1" as Id<"workouts">,
        _creationTime: 1,
        title: "Ramp",
        intervals: [{ startPower: 110, endPower: 110, durationSeconds: 60 }],
        intervalsRevision: 0,
      })
    ).toMatchObject({ id: "w1", powerMode: "percentage" })
  })
})
