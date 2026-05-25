import { describe, expect, it } from "vitest"
import { buildRouteEndpointGeojson } from "./utils"

describe("buildRouteEndpointGeojson", () => {
  it("returns no features when both endpoints are null", () => {
    expect(
      buildRouteEndpointGeojson({ start: null, finish: null }).features
    ).toEqual([])
  })

  it("returns only a start feature when only start exists", () => {
    expect(
      buildRouteEndpointGeojson({
        start: { lat: 37.8, lng: -122.4 },
        finish: null,
      }).features
    ).toEqual([
      {
        type: "Feature",
        properties: { kind: "start" },
        geometry: {
          type: "Point",
          coordinates: [-122.4, 37.8],
        },
      },
    ])
  })

  it("returns only a finish feature when only finish exists", () => {
    expect(
      buildRouteEndpointGeojson({
        start: null,
        finish: { lat: 37.9, lng: -122.5 },
      }).features
    ).toEqual([
      {
        type: "Feature",
        properties: { kind: "finish" },
        geometry: {
          type: "Point",
          coordinates: [-122.5, 37.9],
        },
      },
    ])
  })

  it("returns start then finish when both endpoints exist", () => {
    expect(
      buildRouteEndpointGeojson({
        start: { lat: 37.8, lng: -122.4 },
        finish: { lat: 37.9, lng: -122.5 },
      }).features.map((feature) => feature.properties.kind)
    ).toEqual(["start", "finish"])
  })

  it("serializes coordinates as lng then lat", () => {
    expect(
      buildRouteEndpointGeojson({
        start: { lat: 37.8, lng: -122.4 },
        finish: { lat: 37.9, lng: -122.5 },
      }).features.map((feature) => feature.geometry.coordinates)
    ).toEqual([
      [-122.4, 37.8],
      [-122.5, 37.9],
    ])
  })
})
