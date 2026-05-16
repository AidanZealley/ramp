import { act, render, screen } from "@testing-library/react"
import { forwardRef, useEffect, useImperativeHandle } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RoutePreviewMap } from "./RoutePreviewMap"
import type { PropsWithChildren } from "react"
import type { FeatureCollection, LineString } from "geojson"

const useTheme = vi.fn()
const fitBounds = vi.fn()
const resize = vi.fn()
let resizeCallback: (() => void) | null = null

vi.mock("@/components/theme-provider", () => ({
  useTheme: () => useTheme(),
}))

vi.mock("@vis.gl/react-maplibre", () => ({
  default: forwardRef(
    (
      {
        children,
        mapStyle,
        onLoad,
      }: PropsWithChildren<{
        mapStyle: string
        onLoad?: () => void
      }>,
      ref
    ) => {
      useImperativeHandle(ref, () => ({
        fitBounds,
        resize,
      }))

      useEffect(() => {
        onLoad?.()
      }, [onLoad])

      return (
        <div data-testid="map" data-map-style={mapStyle}>
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
  Layer: ({
    id,
    paint,
    type,
  }: {
    id: string
    paint: unknown
    type: string
  }) => (
    <div
      data-testid={id}
      data-layer-type={type}
      data-paint={JSON.stringify(paint)}
    />
  ),
  Marker: ({
    children,
    latitude,
    longitude,
  }: PropsWithChildren<{ latitude: number; longitude: number }>) => (
    <div
      data-testid="marker"
      data-latitude={latitude}
      data-longitude={longitude}
    >
      {children}
    </div>
  ),
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

describe("RoutePreviewMap", () => {
  beforeEach(() => {
    useTheme.mockReturnValue({ theme: "light" })
    fitBounds.mockClear()
    resize.mockClear()
    resizeCallback = null
    vi.unstubAllEnvs()
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        constructor(callback: () => void) {
          resizeCallback = callback
        }
        observe = vi.fn()
        disconnect = vi.fn()
      }
    )
  })

  it("uses light and dark map styles", () => {
    const { rerender } = render(
      <RoutePreviewMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
      />
    )

    expect(screen.getByTestId("map").getAttribute("data-map-style")).toBe(
      "https://tiles.openfreemap.org/styles/positron"
    )

    useTheme.mockReturnValue({ theme: "dark" })
    rerender(
      <RoutePreviewMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
      />
    )

    expect(screen.getByTestId("map").getAttribute("data-map-style")).toBe(
      "https://tiles.openfreemap.org/styles/dark"
    )
  })

  it("fits bounds on load and refits on resize", () => {
    render(
      <RoutePreviewMap
        geojson={geojson}
        bounds={{
          minLat: 37.8,
          minLng: -122.5,
          maxLat: 37.9,
          maxLng: -122.4,
        }}
        start={null}
        finish={null}
      />
    )

    expect(resize).toHaveBeenCalled()
    expect(fitBounds).toHaveBeenCalledWith(
      [
        [-122.5, 37.8],
        [-122.4, 37.9],
      ],
      { padding: 40, duration: 0, pitch: 0, bearing: 0 }
    )

    act(() => {
      resizeCallback?.()
    })

    expect(fitBounds).toHaveBeenCalledTimes(2)
  })

  it("renders route source, route layers, start marker, and finish marker", () => {
    render(
      <RoutePreviewMap
        geojson={geojson}
        bounds={null}
        start={{ lat: 37.8, lng: -122.4 }}
        finish={{ lat: 37.9, lng: -122.5 }}
      />
    )

    expect(
      screen.getByTestId("source-route-line").getAttribute("data-source-type")
    ).toBe("geojson")
    expect(
      screen.getByTestId("route-line-shadow").getAttribute("data-layer-type")
    ).toBe("line")
    expect(
      screen.getByTestId("route-line-primary").getAttribute("data-layer-type")
    ).toBe("line")
    expect(screen.getAllByTestId("marker")).toHaveLength(2)
  })

  it("does not render terrain or rider sources", () => {
    render(
      <RoutePreviewMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
      />
    )

    expect(screen.queryByTestId("source-route-terrain-dem")).toBeNull()
    expect(screen.queryByTestId("source-route-rider")).toBeNull()
  })
})
