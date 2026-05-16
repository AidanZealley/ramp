import { act, render, screen } from "@testing-library/react"
import { forwardRef, useEffect, useImperativeHandle } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RouteMiniMap } from "./RouteMiniMap"
import type { PropsWithChildren } from "react"
import type { FeatureCollection, LineString } from "geojson"
import type { ParsedRouteGpx } from "@/lib/routes/types"

const useTheme = vi.fn()
const fitBounds = vi.fn()
const resize = vi.fn()
let clickHandler: (event: {
  lngLat: { lat: number; lng: number }
}) => void = () => {}

vi.mock("@/components/theme-provider", () => ({
  useTheme: () => useTheme(),
}))

vi.mock("@vis.gl/react-maplibre", () => ({
  default: forwardRef(
    (
      {
        children,
        onClick,
        onLoad,
        sky,
      }: PropsWithChildren<{
        onClick?: (event: { lngLat: { lat: number; lng: number } }) => void
        onLoad?: () => void
        sky?: unknown
      }>,
      ref
    ) => {
      clickHandler = onClick ?? (() => {})
      useImperativeHandle(ref, () => ({
        fitBounds,
        resize,
      }))

      useEffect(() => {
        onLoad?.()
      }, [onLoad])

      return (
        <div data-testid="map" data-sky={JSON.stringify(sky ?? null)}>
          {children}
        </div>
      )
    }
  ),
  Source: ({
    children,
    id,
    data,
    type,
  }: PropsWithChildren<{
    id: string
    data?: unknown
    type: string
  }>) => (
    <div
      data-testid={`source-${id}`}
      data-source-type={type}
      data-source-data={JSON.stringify(data ?? null)}
    >
      {children}
    </div>
  ),
  Layer: ({ id, type }: { id: string; type: string }) => (
    <div data-testid={id} data-layer-type={type} />
  ),
  Marker: ({ children }: PropsWithChildren) => <>{children}</>,
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
  points: [
    { lat: 37.8, lng: -122.4, elevationMeters: 10, distanceMeters: 0 },
    { lat: 37.9, lng: -122.5, elevationMeters: 20, distanceMeters: 1000 },
  ],
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
  beforeEach(() => {
    useTheme.mockReturnValue({ theme: "light" })
    fitBounds.mockClear()
    resize.mockClear()
  })

  it("renders route data and rider progress without terrain", () => {
    render(
      <RouteMiniMap
        onRouteClick={vi.fn()}
        riderDistanceMeters={500}
        riderPosition={{ lat: 37.8, lng: -122.4 }}
        route={route}
      />
    )

    expect(
      screen.getByTestId("source-route-line").getAttribute("data-source-type")
    ).toBe("geojson")
    expect(screen.queryByTestId("source-route-terrain-dem")).toBeNull()
    expect(
      screen.getByTestId("source-route-rider").getAttribute("data-source-type")
    ).toBe("geojson")
    expect(
      JSON.parse(
        screen
          .getByTestId("source-route-rider")
          .getAttribute("data-source-data") ?? "{}"
      ).features[0].geometry.coordinates
    ).toEqual([-122.45, 37.849999999999994])
  })

  it("wires route click navigation intent", () => {
    const onRouteClick = vi.fn()
    render(
      <RouteMiniMap
        onRouteClick={onRouteClick}
        riderDistanceMeters={500}
        riderPosition={{ lat: 37.8, lng: -122.4 }}
        route={route}
      />
    )

    act(() => {
      clickHandler({ lngLat: { lat: 38, lng: -123 } })
    })

    expect(onRouteClick).toHaveBeenCalledWith({ lat: 38, lng: -123 })
  })

  it("forces top-down, terrain-free behavior", () => {
    render(
      <RouteMiniMap
        onRouteClick={vi.fn()}
        riderDistanceMeters={500}
        riderPosition={{ lat: 37.8, lng: -122.4 }}
        route={route}
      />
    )

    expect(screen.getByTestId("map").getAttribute("data-sky")).toBe("null")
    expect(fitBounds).toHaveBeenCalledWith(
      [
        [-122.5, 37.8],
        [-122.4, 37.9],
      ],
      { padding: 24, duration: 0, pitch: 0, bearing: 0 }
    )
  })
})
