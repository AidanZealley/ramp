import { describe, expect, it } from "vitest"
import { computeWorkoutSummary } from "./workoutSummary"

describe("computeWorkoutSummary", () => {
  it("returns zeroed values for an empty workout", () => {
    expect(computeWorkoutSummary([])).toEqual({
      totalDurationSeconds: 0,
      stressScore: 0,
    })
  })

  it("computes expected values for a one-hour threshold ride", () => {
    const summary = computeWorkoutSummary([
      {
        startPower: 100,
        endPower: 100,
        durationSeconds: 3600,
      },
    ])

    expect(summary.totalDurationSeconds).toBe(3600)
    expect(summary.stressScore).toBeCloseTo(100, 6)
  })
})
