import { describe, expect, it } from "vitest"
import { buildParsedRouteFromPoints } from "./gpx"
import { sliceParsedRouteGpx } from "./slice"
import type { RoutePoint } from "./types"

function route(points: Array<RoutePoint>) {
  return buildParsedRouteFromPoints("Lunch Loop", points)
}

describe("sliceParsedRouteGpx", () => {
  it("rebases distances and interpolates boundary points", () => {
    const sliced = sliceParsedRouteGpx(
      route([
        { lat: 0, lng: 0, elevationMeters: 100, distanceMeters: 0 },
        { lat: 0, lng: 1, elevationMeters: 200, distanceMeters: 100 },
        { lat: 0, lng: 2, elevationMeters: 150, distanceMeters: 200 },
      ]),
      { startDistanceMeters: 50, endDistanceMeters: 150 },
      { title: "Lunch Loop - Climb 1" }
    )

    expect(sliced.title).toBe("Lunch Loop - Climb 1")
    expect(sliced.points.map((point) => point.distanceMeters)).toEqual([
      0, 50, 100,
    ])
    expect(sliced.points[0]).toMatchObject({
      lat: 0,
      lng: 0.5,
      elevationMeters: 150,
    })
    expect(sliced.points[2]).toMatchObject({
      lat: 0,
      lng: 1.5,
      elevationMeters: 175,
    })
  })

  it("rebuilds geojson, stats, bounds, endpoints, elevation, and preview", () => {
    const sliced = sliceParsedRouteGpx(
      route([
        { lat: 1, lng: 1, elevationMeters: 100, distanceMeters: 0 },
        { lat: 2, lng: 2, elevationMeters: 125, distanceMeters: 100 },
        { lat: 3, lng: 3, elevationMeters: 115, distanceMeters: 200 },
      ]),
      { startDistanceMeters: 0, endDistanceMeters: 150 },
      { title: "Segment" }
    )

    expect(sliced.geojson.features[0]?.geometry.coordinates).toEqual([
      [1, 1],
      [2, 2],
      [2.5, 2.5],
    ])
    expect(sliced.stats).toEqual({
      distanceMeters: 150,
      elevationGainMeters: 25,
      elevationLossMeters: 5,
      minElevationMeters: 100,
      maxElevationMeters: 125,
      pointCount: 3,
    })
    expect(sliced.bounds).toEqual({
      minLat: 1,
      minLng: 1,
      maxLat: 2.5,
      maxLng: 2.5,
    })
    expect(sliced.start).toEqual({ lat: 1, lng: 1 })
    expect(sliced.finish).toEqual({ lat: 2.5, lng: 2.5 })
    expect(sliced.elevationSamples).toHaveLength(3)
    expect(sliced.previewPoints).toHaveLength(3)
  })

  it("handles missing elevation", () => {
    const sliced = sliceParsedRouteGpx(
      route([
        { lat: 0, lng: 0, elevationMeters: null, distanceMeters: 0 },
        { lat: 0, lng: 1, elevationMeters: null, distanceMeters: 100 },
      ]),
      { startDistanceMeters: 25, endDistanceMeters: 75 },
      { title: "No elevation" }
    )

    expect(sliced.points.every((point) => point.elevationMeters === null)).toBe(
      true
    )
    expect(sliced.stats.elevationGainMeters).toBe(0)
    expect(sliced.stats.minElevationMeters).toBeNull()
    expect(sliced.elevationSamples).toEqual([])
  })

  it("rejects degenerate ranges predictably", () => {
    expect(() =>
      sliceParsedRouteGpx(
        route([
          { lat: 0, lng: 0, elevationMeters: 0, distanceMeters: 0 },
          { lat: 0, lng: 1, elevationMeters: 1, distanceMeters: 100 },
        ]),
        { startDistanceMeters: 50, endDistanceMeters: 50 },
        { title: "Too short" }
      )
    ).toThrow("Route segment is too short to ride.")
  })
})
