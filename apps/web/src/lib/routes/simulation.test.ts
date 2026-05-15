import { describe, expect, it } from "vitest"
import {
  computeRouteGradePercent,
  findNearestRouteDistanceMeters,
  interpolateRoutePointByDistance,
} from "./simulation"
import type { RoutePoint } from "./types"

const points: Array<RoutePoint> = [
  { lat: 0, lng: 0, elevationMeters: 100, distanceMeters: 0 },
  { lat: 0, lng: 0.001, elevationMeters: 110, distanceMeters: 100 },
  { lat: 0, lng: 0.002, elevationMeters: 90, distanceMeters: 200 },
]

describe("route simulation utilities", () => {
  it("interpolates route position by distance", () => {
    const point = interpolateRoutePointByDistance(points, 50)

    expect(point?.lat).toBeCloseTo(0)
    expect(point?.lng).toBeCloseTo(0.0005)
    expect(point?.elevationMeters).toBeCloseTo(105)
  })

  it("calculates raw positive and negative grade", () => {
    expect(computeRouteGradePercent(points, 50, 0)).toBeCloseTo(10)
    expect(computeRouteGradePercent(points, 150, 0)).toBeCloseTo(-20)
  })

  it("smooths grade over a configured window", () => {
    expect(computeRouteGradePercent(points, 100, 200)).toBeCloseTo(-5)
  })

  it("clamps grade to trainer command limits", () => {
    const steep: Array<RoutePoint> = [
      { lat: 0, lng: 0, elevationMeters: 0, distanceMeters: 0 },
      { lat: 0, lng: 0.001, elevationMeters: 100, distanceMeters: 100 },
    ]

    expect(computeRouteGradePercent(steep, 50, 0)).toBe(25)
  })

  it("returns 0 for missing elevation", () => {
    expect(
      computeRouteGradePercent(
        points.map((point) => ({ ...point, elevationMeters: null })),
        50,
        0
      )
    ).toBe(0)
  })

  it("finds nearest route distance from a clicked lat/lng", () => {
    expect(
      findNearestRouteDistanceMeters(points, { lat: 0.0001, lng: 0.0015 })
    ).toBeCloseTo(150, 0)
  })

  it("handles duplicate zero-distance points safely", () => {
    const duplicated: Array<RoutePoint> = [
      { lat: 0, lng: 0, elevationMeters: 100, distanceMeters: 0 },
      { lat: 0, lng: 0, elevationMeters: 110, distanceMeters: 0 },
      { lat: 0, lng: 0.001, elevationMeters: 120, distanceMeters: 100 },
    ]

    expect(computeRouteGradePercent(duplicated, 0, 0)).toBe(0)
    expect(interpolateRoutePointByDistance(duplicated, 0)?.lat).toBe(0)
  })
})
