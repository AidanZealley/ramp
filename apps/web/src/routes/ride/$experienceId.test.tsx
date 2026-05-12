import { describe, expect, it } from "vitest"
import { validateRideExperienceSearch } from "./$experienceId"

describe("ride experience route search validation", () => {
  it("accepts string run and workoutId values", () => {
    expect(
      validateRideExperienceSearch({
        run: "today",
        workoutId: "workout-1",
      })
    ).toEqual({
      run: "today",
      workoutId: "workout-1",
    })
  })

  it("ignores non-string search values", () => {
    expect(
      validateRideExperienceSearch({
        run: 123,
        workoutId: ["workout-1"],
      })
    ).toEqual({
      run: undefined,
      workoutId: undefined,
    })
  })
})
