import { render, screen } from "@testing-library/react"
import type { FeatureCollection, LineString } from "geojson"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RouteMap } from "./RouteMap"

const useTheme = vi.fn()

vi.mock("@/components/theme-provider", () => ({
  useTheme: () => useTheme(),
}))

vi.mock("@vis.gl/react-maplibre", () => ({
  default: ({
    children,
    mapStyle,
  }: PropsWithChildren<{ mapStyle: string }>) => (
    <div data-testid="map" data-map-style={mapStyle}>
      {children}
    </div>
  ),
  Source: ({ children }: PropsWithChildren) => <>{children}</>,
  Layer: ({ id, paint }: { id: string; paint: unknown }) => (
    <div data-testid={id} data-paint={JSON.stringify(paint)} />
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

describe("RouteMap", () => {
  beforeEach(() => {
    useTheme.mockReturnValue({ theme: "light" })
    vi.unstubAllEnvs()
  })

  it("uses the Positron basemap in light mode", () => {
    render(
      <RouteMap geojson={geojson} bounds={null} start={null} finish={null} />
    )

    expect(screen.getByTestId("map").getAttribute("data-map-style")).toBe(
      "https://tiles.openfreemap.org/styles/positron"
    )
  })

  it("uses the dark basemap in dark mode", () => {
    useTheme.mockReturnValue({ theme: "dark" })

    render(
      <RouteMap geojson={geojson} bounds={null} start={null} finish={null} />
    )

    expect(screen.getByTestId("map").getAttribute("data-map-style")).toBe(
      "https://tiles.openfreemap.org/styles/dark"
    )
  })

  it("uses light overlay colors in light mode", () => {
    render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={{ lat: 37.8, lng: -122.4 }}
        finish={{ lat: 37.9, lng: -122.5 }}
      />
    )

    expect(
      JSON.parse(
        screen.getByTestId("route-line-shadow").getAttribute("data-paint") ??
          "{}"
      )
    ).toEqual({
        "line-color": "rgba(0,0,0,0.24)",
        "line-width": 7,
        "line-opacity": 0.5,
      })
    expect(
      JSON.parse(
        screen.getByTestId("route-line-primary").getAttribute("data-paint") ??
          "{}"
      )
    ).toEqual({
        "line-color": "#4f46e5",
        "line-width": 4,
      })
    expect(document.querySelector('[style*="rgb(101, 163, 13)"]')).toBeTruthy()
    expect(document.querySelector('[style*="rgb(220, 38, 38)"]')).toBeTruthy()
  })

  it("uses dark overlay colors in dark mode", () => {
    useTheme.mockReturnValue({ theme: "dark" })

    render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={{ lat: 37.8, lng: -122.4 }}
        finish={{ lat: 37.9, lng: -122.5 }}
      />
    )

    expect(
      JSON.parse(
        screen.getByTestId("route-line-shadow").getAttribute("data-paint") ??
          "{}"
      )
    ).toEqual({
        "line-color": "rgba(0,0,0,0.65)",
        "line-width": 7,
        "line-opacity": 0.5,
      })
    expect(
      JSON.parse(
        screen.getByTestId("route-line-primary").getAttribute("data-paint") ??
          "{}"
      )
    ).toEqual({
        "line-color": "#818cf8",
        "line-width": 4,
      })
    expect(document.querySelector('[style*="rgb(132, 204, 22)"]')).toBeTruthy()
    expect(document.querySelector('[style*="rgb(248, 113, 113)"]')).toBeTruthy()
  })

  it("uses the shared env style override for both themes", () => {
    vi.stubEnv("VITE_ROUTE_MAP_STYLE_URL", "https://example.test/map-style")

    const { rerender } = render(
      <RouteMap geojson={geojson} bounds={null} start={null} finish={null} />
    )

    expect(screen.getByTestId("map").getAttribute("data-map-style")).toBe(
      "https://example.test/map-style"
    )

    useTheme.mockReturnValue({ theme: "dark" })
    rerender(
      <RouteMap geojson={geojson} bounds={null} start={null} finish={null} />
    )

    expect(screen.getByTestId("map").getAttribute("data-map-style")).toBe(
      "https://example.test/map-style"
    )
  })
})
