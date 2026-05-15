import { describe, expect, it } from "vitest"
import {
  DEFAULT_BIKE_WEIGHT_KG,
  resolveSettingsValues,
  validateBikeWeightKg,
  validateRiderWeightKg,
} from "./settings"

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

  it("accepts valid one-decimal bike weight values", () => {
    expect(validateBikeWeightKg(10)).toBe(10)
    expect(validateBikeWeightKg(10.5)).toBe(10.5)
    expect(validateBikeWeightKg(5)).toBe(5)
    expect(validateBikeWeightKg(30)).toBe(30)
  })

  it("uses the default bike weight when none exists", () => {
    expect(resolveSettingsValues({}, null).bikeWeightKg).toBe(
      DEFAULT_BIKE_WEIGHT_KG
    )
  })

  it("rejects non-finite bike weight values", () => {
    expect(() => validateBikeWeightKg(Number.NaN)).toThrow("finite")
    expect(() => validateBikeWeightKg(Number.POSITIVE_INFINITY)).toThrow(
      "finite"
    )
  })

  it("rejects bike weight values with more than one decimal place", () => {
    expect(() => validateBikeWeightKg(10.55)).toThrow("one decimal")
  })

  it("rejects bike weight values below 5 kg", () => {
    expect(() => validateBikeWeightKg(4.9)).toThrow("between")
  })

  it("rejects bike weight values above 30 kg", () => {
    expect(() => validateBikeWeightKg(30.1)).toThrow("between")
  })

  it("preserves existing bike weight when omitted", () => {
    expect(
      resolveSettingsValues(
        { ftp: 250 },
        {
          ftp: 220,
          powerDisplayMode: "percentage",
          riderWeightKg: 72,
          bikeWeightKg: 12.5,
        }
      ).bikeWeightKg
    ).toBe(12.5)
  })

  it("preserves existing route simulation progress mode when omitted", () => {
    expect(
      resolveSettingsValues(
        { ftp: 250 },
        {
          ftp: 220,
          powerDisplayMode: "percentage",
          riderWeightKg: 72,
          bikeWeightKg: 12.5,
          routeSimulationProgressMode: "app-physics",
        }
      ).routeSimulationProgressMode
    ).toBe("app-physics")
  })
})
