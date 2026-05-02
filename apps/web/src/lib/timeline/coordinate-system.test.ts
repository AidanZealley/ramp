import { describe, expect, it } from "vitest"
import { computeTimeTicks } from "./coordinate-system"

describe("computeTimeTicks", () => {
  it("can surface 10-second guides for short workouts", () => {
    expect(computeTimeTicks(45, 6)).toEqual([10, 20, 30, 40])
  })

  it("can surface 20-second guides before falling back to 30 seconds", () => {
    expect(computeTimeTicks(90, 3)).toEqual([20, 40, 60, 80])
  })
})
