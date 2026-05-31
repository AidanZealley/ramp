import { describe, expect, it } from "vitest"
import { detectRouteSegments } from "."
import type { RoutePoint } from "@/lib/routes/types"

function pointsFromElevations(elevations: Array<number | null>, step = 100) {
  return elevations.map<RoutePoint>((elevationMeters, index) => ({
    lat: 0,
    lng: 0,
    elevationMeters,
    distanceMeters: index * step,
  }))
}

describe("climb segment detector", () => {
  it("returns no segments for missing elevation", () => {
    expect(detectRouteSegments(pointsFromElevations([null, null, null]))).toEqual(
      []
    )
  })

  it("returns no segments for sub-threshold uphill stretches", () => {
    expect(detectRouteSegments(pointsFromElevations([0, 5, 10, 15, 20]))).toEqual(
      []
    )
  })

  it("detects one sustained climb meeting distance, gain, and gradient thresholds", () => {
    const segments = detectRouteSegments(
      pointsFromElevations([0, 5, 10, 18, 26, 34, 42], 100)
    )

    expect(segments).toHaveLength(1)
    expect(segments[0].distanceMeters).toBeGreaterThanOrEqual(500)
    expect(segments[0].elevationGainMeters).toBeGreaterThanOrEqual(30)
    expect(segments[0].averageGradient).toBeGreaterThanOrEqual(0.03)
  })

  it("merges short flat and downhill gaps under the tolerance", () => {
    const segments = detectRouteSegments(
      pointsFromElevations([0, 10, 20, 18, 30, 42, 54], 100)
    )

    expect(segments).toHaveLength(1)
    expect(segments[0].endDistanceMeters).toBeGreaterThanOrEqual(600)
  })

  it("ends a climb after the non-climbing tolerance is exceeded", () => {
    const segments = detectRouteSegments(
      pointsFromElevations([0, 10, 20, 30, 42, 50, 50, 50, 50, 60, 70], 100)
    )

    expect(segments).toHaveLength(1)
    expect(segments[0].endDistanceMeters).toBeLessThan(800)
  })

  it("uses low-to-high boundaries", () => {
    const segments = detectRouteSegments(
      pointsFromElevations([20, 12, 8, 14, 22, 32, 44, 54], 100)
    )

    expect(segments).toHaveLength(1)
    expect(segments[0].startDistanceMeters).toBeCloseTo(200, 0)
  })

  it("sorts multiple climbs in route order", () => {
    const segments = detectRouteSegments(
      pointsFromElevations(
        [0, 10, 20, 30, 42, 52, 45, 35, 30, 40, 50, 62, 74, 86],
        100
      )
    )

    expect(segments.length).toBeGreaterThanOrEqual(2)
    expect(segments[0].startDistanceMeters).toBeLessThan(
      segments[1].startDistanceMeters
    )
  })

  it("downsamples preview samples to at most 80", () => {
    const elevations = Array.from({ length: 140 }, (_, index) => index)
    const segments = detectRouteSegments(pointsFromElevations(elevations, 10))

    expect(segments).toHaveLength(1)
    expect(segments[0].previewSamples.length).toBeLessThanOrEqual(80)
  })
})
