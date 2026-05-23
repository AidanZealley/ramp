import { describe, expect, it } from "vitest"
import {
  buildRouteBearingSegments,
  clampDistanceToRoute,
  computeRouteBearingNearPosition,
  getPerspectivePitch,
  getRoutePositionAtDistanceWithCursor,
  getRoutePositionSnapshotAtDistanceWithCursor,
  lerpBearingDegrees,
  lerpNumber,
  shouldUpdateCamera,
} from "./utils"
import type { FeatureCollection, LineString } from "geojson"
import type { RoutePoint } from "@/lib/routes/types"

describe("route simulation map utils", () => {
  it("calculates perspective pitch from zoom and grade within camera bounds", () => {
    expect(getPerspectivePitch(14)).toBe(48)
    expect(getPerspectivePitch(18)).toBe(80)
    expect(getPerspectivePitch(16, 10, false)).toBe(64)
    expect(getPerspectivePitch(16, -10, false)).toBe(64)
    expect(getPerspectivePitch(16, 5, true)).toBe(68)
    expect(getPerspectivePitch(16, -50, true)).toBe(54)
    expect(getPerspectivePitch(16, 50, true)).toBe(74)
  })

  it("computes the nearest route segment bearing", () => {
    const geojson: FeatureCollection<LineString> = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [0, 1],
              [1, 1],
            ],
          },
        },
      ],
    }
    const segments = buildRouteBearingSegments(geojson)

    expect(
      computeRouteBearingNearPosition(segments, { lat: 0.55, lng: 0.02 })
    ).toBeCloseTo(0)
    expect(
      computeRouteBearingNearPosition(segments, { lat: 1.02, lng: 0.55 })
    ).toBeCloseTo(90, 1)
  })

  it("only updates camera when movement exceeds thresholds or mode changes", () => {
    const previous = {
      bearing: 10,
      center: [0, 0] as [number, number],
      followPosition: true,
      pitch: 60,
      terrainEnabled: true,
      viewMode: "perspective" as const,
    }

    expect(shouldUpdateCamera(null, previous)).toBe(true)
    expect(
      shouldUpdateCamera(previous, {
        ...previous,
        bearing: 11,
        pitch: 60.5,
        center: [0.000001, 0.000001],
      })
    ).toBe(false)
    expect(shouldUpdateCamera(previous, { ...previous, bearing: 12 })).toBe(
      true
    )
    expect(
      shouldUpdateCamera(previous, { ...previous, viewMode: "top-down" })
    ).toBe(true)
  })

  it("interpolates bearings across the shortest turn", () => {
    expect(lerpBearingDegrees(350, 10, 0.5)).toBeCloseTo(0)
    expect(lerpBearingDegrees(10, 350, 0.5)).toBeCloseTo(0)
    expect(lerpBearingDegrees(90, 180, 0.25)).toBeCloseTo(112.5)
  })

  it("interpolates numbers within clamped progress", () => {
    expect(lerpNumber(10, 20, 0.25)).toBe(12.5)
    expect(lerpNumber(10, 20, -1)).toBe(10)
    expect(lerpNumber(10, 20, 2)).toBe(20)
  })

  it("clamps rider distance to the available route distance range", () => {
    const points = [
      { distanceMeters: 10 },
      { distanceMeters: 50 },
      { distanceMeters: 100 },
    ] as Array<RoutePoint>

    expect(clampDistanceToRoute(points, -20)).toBe(10)
    expect(clampDistanceToRoute(points, 60)).toBe(60)
    expect(clampDistanceToRoute(points, 120)).toBe(100)
  })

  it("interpolates route positions with a forward cursor", () => {
    const points = [
      { lat: 0, lng: 0, elevationMeters: 0, distanceMeters: 0 },
      { lat: 0, lng: 1, elevationMeters: 10, distanceMeters: 100 },
      { lat: 1, lng: 1, elevationMeters: 20, distanceMeters: 200 },
    ] as Array<RoutePoint>
    const cursor = { segmentIndex: 0 }

    expect(
      getRoutePositionAtDistanceWithCursor({
        routePoints: points,
        distanceMeters: 50,
        cursor,
      })
    ).toEqual({
      lat: 0,
      lng: 0.5,
    })
    expect(cursor.segmentIndex).toBe(0)

    expect(
      getRoutePositionAtDistanceWithCursor({
        routePoints: points,
        distanceMeters: 150,
        cursor,
      })
    ).toEqual({
      lat: 0.5,
      lng: 1,
    })
    expect(cursor.segmentIndex).toBe(1)
  })

  it("returns route-distance snapshots with active segment and bearing", () => {
    const points = [
      { lat: 0, lng: 0, elevationMeters: 0, distanceMeters: 0 },
      { lat: 0, lng: 1, elevationMeters: 10, distanceMeters: 100 },
      { lat: 1, lng: 1, elevationMeters: 20, distanceMeters: 200 },
    ] as Array<RoutePoint>
    const cursor = { segmentIndex: 0 }

    expect(
      getRoutePositionSnapshotAtDistanceWithCursor({
        routePoints: points,
        distanceMeters: 150,
        cursor,
      })
    ).toEqual({
      position: { lat: 0.5, lng: 1 },
      segmentIndex: 1,
      bearing: expect.any(Number),
    })
    expect(
      getRoutePositionSnapshotAtDistanceWithCursor({
        routePoints: points,
        distanceMeters: 150,
        cursor: { segmentIndex: 0 },
      }).bearing
    ).toBeCloseTo(0)
  })

  it("advances the route-distance cursor monotonically as distance increases", () => {
    const points = [
      { lat: 0, lng: 0, elevationMeters: 0, distanceMeters: 0 },
      { lat: 0, lng: 1, elevationMeters: 0, distanceMeters: 100 },
      { lat: 0, lng: 2, elevationMeters: 0, distanceMeters: 200 },
      { lat: 0, lng: 3, elevationMeters: 0, distanceMeters: 300 },
    ] as Array<RoutePoint>
    const cursor = { segmentIndex: 0 }

    getRoutePositionSnapshotAtDistanceWithCursor({
      routePoints: points,
      distanceMeters: 50,
      cursor,
    })
    expect(cursor.segmentIndex).toBe(0)
    getRoutePositionSnapshotAtDistanceWithCursor({
      routePoints: points,
      distanceMeters: 175,
      cursor,
    })
    expect(cursor.segmentIndex).toBe(1)
    getRoutePositionSnapshotAtDistanceWithCursor({
      routePoints: points,
      distanceMeters: 275,
      cursor,
    })
    expect(cursor.segmentIndex).toBe(2)
  })

  it("returns null bearing for zero-length route-distance segments", () => {
    const points = [
      { lat: 0, lng: 0, elevationMeters: 0, distanceMeters: 0 },
      { lat: 0, lng: 0, elevationMeters: 0, distanceMeters: 0 },
      { lat: 1, lng: 0, elevationMeters: 0, distanceMeters: 100 },
    ] as Array<RoutePoint>

    expect(
      getRoutePositionSnapshotAtDistanceWithCursor({
        routePoints: points,
        distanceMeters: 0,
        cursor: { segmentIndex: 0 },
      })
    ).toEqual({
      position: { lat: 0, lng: 0 },
      segmentIndex: 0,
      bearing: null,
    })
  })

  it("falls back to binary segment lookup for backwards movement", () => {
    const points = [
      { lat: 0, lng: 0, elevationMeters: null, distanceMeters: 0 },
      { lat: 0, lng: 1, elevationMeters: null, distanceMeters: 100 },
      { lat: 1, lng: 1, elevationMeters: null, distanceMeters: 200 },
    ] as Array<RoutePoint>
    const cursor = { segmentIndex: 1 }

    expect(
      getRoutePositionAtDistanceWithCursor({
        routePoints: points,
        distanceMeters: 25,
        cursor,
      })
    ).toEqual({
      lat: 0,
      lng: 0.25,
    })
    expect(cursor.segmentIndex).toBe(0)
  })
})
