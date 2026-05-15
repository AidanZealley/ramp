import { describe, expect, it } from "vitest"
import { validateRiderWeightKg } from "./settings"

describe("settings helpers", () => {
  it("accepts valid rider weight values and normalizes to one decimal", () => {
    expect(validateRiderWeightKg(75)).toBe(75)
    expect(validateRiderWeightKg(75.5)).toBe(75.5)
    expect(validateRiderWeightKg(30)).toBe(30)
    expect(validateRiderWeightKg(250)).toBe(250)
  })

  it("rejects invalid rider weight values", () => {
    expect(() => validateRiderWeightKg(Number.NaN)).toThrow("finite")
    expect(() => validateRiderWeightKg(29.9)).toThrow("between")
    expect(() => validateRiderWeightKg(250.1)).toThrow("between")
    expect(() => validateRiderWeightKg(75.55)).toThrow("one decimal")
  })
})
