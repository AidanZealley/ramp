import { describe, expect, it } from "vitest"
import { normalizeRouteTitle, validatePreviewPoints } from "./routes"
import { validateGeneratedRouteSegments } from "./routeSegmentValidators"

describe("routes helpers", () => {
  it("normalizes titles", () => {
    expect(normalizeRouteTitle("  Morning   Ride  ")).toBe("Morning Ride")
    expect(() => normalizeRouteTitle("   ")).toThrow("Route title")
  })

  it("validates bounded normalized preview points", () => {
    const points = Array.from({ length: 80 }, (_, index) => ({
      x: index / 79,
      y: 1 - index / 79,
    }))

    expect(validatePreviewPoints(points)).toBe(points)
    expect(() => validatePreviewPoints([...points, { x: 0, y: 0 }])).toThrow(
      "at most 80"
    )
    expect(() => validatePreviewPoints([{ x: 1.2, y: 0 }])).toThrow(
      "normalized"
    )
  })
})

describe("route segment validation", () => {
  const validSegment = {
    type: "climb" as const,
    startDistanceMeters: 100,
    endDistanceMeters: 700,
    distanceMeters: 600,
    startElevationMeters: 10,
    endElevationMeters: 50,
    elevationGainMeters: 40,
    averageGradient: 40 / 600,
    previewSamples: [
      { distanceMeters: 100, elevationMeters: 10 },
      { distanceMeters: 700, elevationMeters: 50 },
    ],
  }

  it("accepts generated climb segment inputs", () => {
    expect(validateGeneratedRouteSegments([validSegment])).toEqual([
      validSegment,
    ])
  })

  it("rejects invalid numeric values and malformed preview samples", () => {
    expect(() =>
      validateGeneratedRouteSegments([
        { ...validSegment, averageGradient: Number.NaN },
      ])
    ).toThrow("averageGradient")

    expect(() =>
      validateGeneratedRouteSegments([
        {
          ...validSegment,
          previewSamples: [
            { distanceMeters: 700, elevationMeters: 50 },
            { distanceMeters: 100, elevationMeters: 10 },
          ],
        },
      ])
    ).toThrow("ordered")
  })
})
