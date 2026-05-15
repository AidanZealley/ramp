import { describe, expect, it } from "vitest"
import { getWorkoutSegmentAtElapsed } from "./segments"

describe("workout segments", () => {
  it("returns null for empty intervals", () => {
    expect(getWorkoutSegmentAtElapsed([], 0, 200)).toBeNull()
  })

  it("clamps negative elapsed to the first segment and treats negative duration as zero", () => {
    expect(
      getWorkoutSegmentAtElapsed(
        [
          { startPower: 50, endPower: 100, durationSeconds: 60 },
          { startPower: 120, endPower: 120, durationSeconds: 30 },
        ],
        -10,
        200
      )
    ).toMatchObject({ index: 0, targetWatts: 100 })

    expect(
      getWorkoutSegmentAtElapsed(
        [
          { startPower: 50, endPower: 100, durationSeconds: -1 },
          { startPower: 120, endPower: 120, durationSeconds: 30 },
        ],
        0,
        200
      )
    ).toMatchObject({ index: 1, targetWatts: 240 })
  })

  it("handles boundaries and final endpoints", () => {
    const intervals = [
      { startPower: 70, endPower: 70, durationSeconds: 60 },
      { startPower: 110, endPower: 110, durationSeconds: 30 },
    ]

    expect(getWorkoutSegmentAtElapsed(intervals, 60, 200)).toMatchObject({
      index: 1,
    })
    expect(getWorkoutSegmentAtElapsed(intervals, 90, 200)).toMatchObject({
      index: 1,
    })
    expect(getWorkoutSegmentAtElapsed(intervals, 91, 200)).toBeNull()
  })

  it("supports percentage and absolute power modes", () => {
    const intervals = [
      { startPower: 110, endPower: 110, durationSeconds: 60 },
    ]

    expect(
      getWorkoutSegmentAtElapsed(intervals, 0, 200, "percentage")?.targetWatts
    ).toBe(220)
    expect(
      getWorkoutSegmentAtElapsed(intervals, 0, 200, "absolute")?.targetWatts
    ).toBe(110)
  })

  it("interpolates ramps and trims comments with label fallback", () => {
    const intervals = [
      {
        startPower: 50,
        endPower: 100,
        durationSeconds: 60,
        comment: "  Ramp  ",
      },
      { startPower: 90, endPower: 90, durationSeconds: 30, comment: "  " },
    ]

    expect(getWorkoutSegmentAtElapsed(intervals, 30, 200)).toMatchObject({
      index: 0,
      targetWatts: 150,
      label: "Ramp",
    })
    expect(getWorkoutSegmentAtElapsed(intervals, 60, 200)).toMatchObject({
      index: 1,
      label: "Segment 2",
    })
  })
})
