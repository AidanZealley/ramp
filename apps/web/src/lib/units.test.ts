import { describe, expect, it } from "vitest"
import {
  displayWeightToKg,
  formatDistanceMeters,
  formatElevationMeters,
  formatSpeedKph,
  formatSpeedMps,
  formatWeightKg,
  kgToDisplayWeight,
} from "./units"

describe("unit formatters", () => {
  it("formats metric and imperial distance", () => {
    expect(formatDistanceMeters(1234, "metric")).toBe("1.2 km")
    expect(formatDistanceMeters(1234, "metric", { precision: 2 })).toBe(
      "1.23 km"
    )
    expect(formatDistanceMeters(1609.344, "imperial")).toBe("1.0 mi")
  })

  it("formats compact metric meters under one kilometer", () => {
    expect(formatDistanceMeters(842, "metric", { compactUnderKm: true })).toBe(
      "842 m"
    )
  })

  it("formats elevation and missing elevation", () => {
    expect(formatElevationMeters(null, "metric")).toBe("No elevation")
    expect(formatElevationMeters(Number.NaN, "metric")).toBe("No elevation")
    expect(formatElevationMeters(100, "metric")).toBe("100 m")
    expect(formatElevationMeters(100, "imperial")).toBe("328 ft")
  })

  it("formats kph and mps speeds", () => {
    expect(formatSpeedKph(28.8, "metric")).toBe("28.8 km/h")
    expect(formatSpeedKph(28.8, "imperial")).toBe("17.9 mph")
    expect(formatSpeedMps(8, "metric")).toBe("28.8 km/h")
    expect(formatSpeedMps(8, "imperial")).toBe("17.9 mph")
  })

  it("formats speed placeholders with the selected unit", () => {
    expect(formatSpeedMps(null, "metric")).toBe("-- km/h")
    expect(formatSpeedMps(null, "imperial")).toBe("-- mph")
  })

  it("converts and formats weight", () => {
    expect(formatWeightKg(75, "metric")).toBe("75.0 kg")
    expect(formatWeightKg(75, "imperial")).toBe("165.3 lb")
    expect(kgToDisplayWeight(75, "imperial").value).toBeCloseTo(165.35, 2)
    expect(displayWeightToKg(165.34669663875, "imperial")).toBeCloseTo(75)
  })

  it("clamps invalid and negative display values consistently", () => {
    expect(formatDistanceMeters(-10, "metric")).toBe("0.0 km")
    expect(formatDistanceMeters(Number.NaN, "imperial")).toBe("0.0 mi")
    expect(formatSpeedKph(-10, "metric")).toBe("0.0 km/h")
  })
})
