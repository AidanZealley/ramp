import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RouteSimulationMap } from "./RouteSimulationMap"
import type { FeatureCollection, LineString } from "geojson"
import type { ParsedRouteGpx } from "@/lib/routes/types"

const routeMap = vi.fn()

vi.mock("@/components/route/route-map", () => ({
  RouteMap: (props: unknown) => {
    routeMap(props)
    return <div data-testid="route-map" />
  },
}))

const geojson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-122.4, 37.8],
          [-122.5, 37.9],
        ],
      },
    },
  ],
} as FeatureCollection<LineString>

const route: ParsedRouteGpx = {
  title: "Test route",
  points: [],
  geojson,
  stats: {
    distanceMeters: 1000,
    elevationGainMeters: 10,
    elevationLossMeters: 5,
    minElevationMeters: null,
    maxElevationMeters: null,
    pointCount: 2,
  },
  bounds: null,
  start: { lat: 37.8, lng: -122.4 },
  finish: { lat: 37.9, lng: -122.5 },
  elevationSamples: [],
  previewPoints: [],
}

describe("RouteSimulationMap", () => {
  it("passes terrain presentation through unchanged", () => {
    render(
      <RouteSimulationMap
        follow
        onRouteClick={vi.fn()}
        presentation={{ terrainEnabled: true, viewMode: "perspective" }}
        riderGradePercent={4}
        riderPosition={{
          lat: 37.85,
          lng: -122.45,
          elevationMeters: 80,
          distanceMeters: 500,
        }}
        route={route}
      />
    )

    expect(routeMap).toHaveBeenCalledWith(
      expect.objectContaining({
        terrainEnabled: true,
        viewMode: "perspective",
      })
    )
  })
})
