import { describe, expect, it } from "vitest"
import { toWorkoutDefinition } from "./convex-workout-mapper"

describe("toWorkoutDefinition", () => {
  it("defaults powerMode to percentage", () => {
    expect(
      toWorkoutDefinition({
        _id: "w1",
        title: "Ramp",
        intervals: [{ startPower: 110, endPower: 110, durationSeconds: 60 }],
      })
    ).toMatchObject({ id: "w1", powerMode: "percentage" })
  })
})
