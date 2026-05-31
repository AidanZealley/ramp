import { describe, expect, it } from "vitest"
import { validateRideExperienceSearch } from "./$experienceId"

describe("ride experience route search validation", () => {
  it("accepts string run, routeId, routeSegmentId, and workoutId values", () => {
    expect(
      validateRideExperienceSearch({
        routeId: "route-1",
        routeSegmentId: "segment-1",
        run: "today",
        workoutId: "workout-1",
      })
    ).toEqual({
      routeId: "route-1",
      routeSegmentId: "segment-1",
      run: "today",
      workoutId: "workout-1",
    })
  })

  it("ignores non-string search values", () => {
    expect(
      validateRideExperienceSearch({
        routeId: null,
        routeSegmentId: 123,
        run: 123,
        workoutId: ["workout-1"],
      })
    ).toEqual({
      routeId: undefined,
      routeSegmentId: undefined,
      run: undefined,
      workoutId: undefined,
    })
  })
})
