import { describe, expect, it } from "vitest"
import { validateRideExperienceSearch } from "./$experienceId"

describe("ride experience route search validation", () => {
  it("accepts string run, routeId, and workoutId values", () => {
    expect(
      validateRideExperienceSearch({
        routeId: "route-1",
        run: "today",
        workoutId: "workout-1",
      })
    ).toEqual({
      routeId: "route-1",
      run: "today",
      workoutId: "workout-1",
    })
  })

  it("ignores non-string search values", () => {
    expect(
      validateRideExperienceSearch({
        routeId: null,
        run: 123,
        workoutId: ["workout-1"],
      })
    ).toEqual({
      routeId: undefined,
      run: undefined,
      workoutId: undefined,
    })
  })
})
