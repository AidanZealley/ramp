import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RouteMiniMap } from "./RouteMiniMap"
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
  bounds: {
    minLat: 37.8,
    minLng: -122.5,
    maxLat: 37.9,
    maxLng: -122.4,
  },
  start: { lat: 37.8, lng: -122.4 },
  finish: { lat: 37.9, lng: -122.5 },
  elevationSamples: [],
  previewPoints: [],
}

describe("RouteMiniMap", () => {
  it("keeps the mini-map terrain-free and top-down", () => {
    render(
      <RouteMiniMap
        onRouteClick={vi.fn()}
        riderPosition={{ lat: 37.85, lng: -122.45 }}
        route={route}
      />
    )

    expect(routeMap).toHaveBeenCalledWith(
      expect.objectContaining({
        terrainEnabled: false,
        viewMode: "top-down",
      })
    )
  })
})
