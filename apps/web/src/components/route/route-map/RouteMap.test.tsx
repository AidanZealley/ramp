import { render, screen, waitFor } from "@testing-library/react"
import { forwardRef, useEffect, useImperativeHandle } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RouteMap } from "./RouteMap"
import type { PropsWithChildren } from "react"
import type { FeatureCollection, LineString } from "geojson"

const useTheme = vi.fn()
const easeTo = vi.fn()
const fitBounds = vi.fn()
const queryTerrainElevation = vi.fn()
const resize = vi.fn()
const setTerrain = vi.fn()
const sourceIds = new Set<string>()
let mapZoom = 10

vi.mock("@/components/theme-provider", () => ({
  useTheme: () => useTheme(),
}))

vi.mock("@vis.gl/react-maplibre", () => ({
  default: forwardRef(
    (
      {
        children,
        mapStyle,
        maxPitch,
        sky,
        onIdle,
        onLoad,
        onSourceData,
      }: PropsWithChildren<{
        mapStyle: string
        maxPitch?: number
        sky?: unknown
        onIdle?: () => void
        onLoad?: () => void
        onSourceData?: (event: { sourceId: string }) => void
      }>,
      ref
    ) => {
      useImperativeHandle(ref, () => ({
        easeTo,
        fitBounds,
        getMap: () => ({
          getSource: (id: string) => sourceIds.has(id),
          setTerrain,
        }),
        getZoom: () => mapZoom,
        queryTerrainElevation,
        resize,
      }))

      useEffect(() => {
        onLoad?.()
        onSourceData?.({ sourceId: "route-terrain-dem" })
        onIdle?.()
      }, [onIdle, onLoad, onSourceData])

      return (
        <div
          data-testid="map"
          data-map-style={mapStyle}
          data-max-pitch={maxPitch}
          data-sky={JSON.stringify(sky ?? null)}
        >
          {children}
        </div>
      )
    }
  ),
  Source: ({
    attribution,
    children,
    encoding,
    id,
    maxzoom,
    tileSize,
    tiles,
    type,
    url,
  }: PropsWithChildren<{
    attribution?: string
    encoding?: string
    id: string
    maxzoom?: number
    tileSize?: number
    tiles?: Array<string>
    type: string
    url?: string
  }>) => {
    sourceIds.add(id)
    return (
      <div
        data-testid={`source-${id}`}
        data-attribution={attribution}
        data-encoding={encoding}
        data-maxzoom={maxzoom}
        data-source-type={type}
        data-tile-size={tileSize}
        data-tiles={JSON.stringify(tiles ?? null)}
        data-url={url}
      >
        {children}
      </div>
    )
  },
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
    easeTo.mockClear()
    fitBounds.mockClear()
    queryTerrainElevation.mockReset()
    queryTerrainElevation.mockReturnValue(null)
    mapZoom = 10
    resize.mockClear()
    setTerrain.mockClear()
    sourceIds.clear()
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

  it("fits the route bounds with padding", () => {
    render(
      <RouteMap
        geojson={geojson}
        bounds={{
          minLat: 37.8,
          minLng: -122.5,
          maxLat: 37.9,
          maxLng: -122.4,
        }}
        start={{ lat: 37.8, lng: -122.4 }}
        finish={{ lat: 37.9, lng: -122.5 }}
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
  })

  it("defaults to a lightweight top-down map without terrain", () => {
    render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        followPosition
        riderPosition={{ lat: 37.8, lng: -122.4 }}
      />
    )

    expect(screen.queryByTestId("source-route-terrain-dem")).toBeNull()
    expect(setTerrain).toHaveBeenCalledWith(null)
    expect(easeTo).toHaveBeenCalledWith(
      expect.objectContaining({
        bearing: 0,
        pitch: 0,
      })
    )
  })

  it("renders terrain source and passes terrain config when enabled", () => {
    render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        terrainEnabled
      />
    )

    expect(
      screen
        .getByTestId("source-route-terrain-dem")
        .getAttribute("data-source-type")
    ).toBe("raster-dem")
    expect(
      JSON.parse(
        screen.getByTestId("source-route-terrain-dem").dataset.tiles ?? "null"
      )
    ).toEqual([
      "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
    ])
    expect(
      screen
        .getByTestId("source-route-terrain-dem")
        .getAttribute("data-encoding")
    ).toBe("terrarium")
    expect(
      screen
        .getByTestId("source-route-terrain-dem")
        .getAttribute("data-maxzoom")
    ).toBe("15")
    expect(screen.getByTestId("route-terrain-hillshade")).toBeTruthy()
    expect(
      JSON.parse(
        screen
          .getByTestId("route-terrain-hillshade")
          .getAttribute("data-paint") ?? "{}"
      )
    ).toEqual({
      "hillshade-shadow-color": "#64748b",
      "hillshade-highlight-color": "#ffffff",
      "hillshade-accent-color": "#94a3b8",
      "hillshade-exaggeration": 0.45,
    })
    expect(setTerrain).toHaveBeenCalledWith({
      source: "route-terrain-dem",
      exaggeration: 2,
    })
  })

  it("uses perspective pitch and route bearing for follow camera", async () => {
    render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        followPosition
        riderElevationMeters={120}
        riderPosition={{ lat: 37.82, lng: -122.42 }}
        terrainEnabled
        viewMode="perspective"
      />
    )

    await waitFor(() =>
      expect(easeTo).toHaveBeenCalledWith(
        expect.objectContaining({
          center: [-122.42, 37.82],
          elevation: 240,
          offset: [0, 140],
          pitch: 60,
          zoom: 15.5,
        })
      )
    )
    expect(easeTo.mock.calls.at(-1)?.[0].bearing).not.toBe(0)
    expect(screen.getByTestId("map").dataset.maxPitch).toBe("80")
  })

  it("uses loaded terrain elevation when it is higher than route elevation", async () => {
    queryTerrainElevation.mockReturnValue(800)

    render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        followPosition
        riderElevationMeters={120}
        riderPosition={{ lat: 37.82, lng: -122.42 }}
        terrainEnabled
        viewMode="perspective"
      />
    )

    await waitFor(() =>
      expect(easeTo).toHaveBeenCalledWith(
        expect.objectContaining({
          elevation: 800,
        })
      )
    )
  })

  it("adjusts perspective pitch with route grade", async () => {
    render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        followPosition
        riderGradePercent={10}
        riderPosition={{ lat: 37.82, lng: -122.42 }}
        viewMode="perspective"
      />
    )

    await waitFor(() =>
      expect(easeTo).toHaveBeenCalledWith(
        expect.objectContaining({
          pitch: 68,
        })
      )
    )
  })

  it("raises perspective pitch as the route camera zooms closer", async () => {
    const { rerender } = render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        followPosition
        riderPosition={{ lat: 37.82, lng: -122.42 }}
        viewMode="perspective"
      />
    )

    await waitFor(() =>
      expect(easeTo).toHaveBeenCalledWith(
        expect.objectContaining({ pitch: 60, zoom: 15.5 })
      )
    )

    easeTo.mockClear()
    mapZoom = 18
    rerender(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        followPosition
        riderPosition={{ lat: 37.83, lng: -122.43 }}
        viewMode="perspective"
      />
    )

    await waitFor(() =>
      expect(easeTo).toHaveBeenCalledWith(
        expect.objectContaining({ pitch: 80, zoom: 18 })
      )
    )
  })

  it("does not restart follow camera animation for sub-threshold rider movement", async () => {
    const { rerender } = render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        followPosition
        riderPosition={{ lat: 37.82, lng: -122.42 }}
        viewMode="perspective"
      />
    )

    await waitFor(() => expect(easeTo).toHaveBeenCalledTimes(1))

    rerender(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        followPosition
        riderPosition={{ lat: 37.820001, lng: -122.420001 }}
        viewMode="perspective"
      />
    )

    expect(easeTo).toHaveBeenCalledTimes(1)

    rerender(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        followPosition
        riderPosition={{ lat: 37.82005, lng: -122.42005 }}
        viewMode="perspective"
      />
    )

    await waitFor(() => expect(easeTo).toHaveBeenCalledTimes(2))
    expect(easeTo.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        center: [-122.42005, 37.82005],
      })
    )
  })

  it("does not recenter the perspective camera when follow is disabled", async () => {
    render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        followPosition={false}
        riderPosition={{ lat: 37.82, lng: -122.42 }}
        viewMode="perspective"
      />
    )

    await waitFor(() =>
      expect(easeTo).toHaveBeenCalledWith(
        expect.objectContaining({ pitch: 48 })
      )
    )
    expect(easeTo.mock.calls.at(-1)?.[0]).not.toHaveProperty("center")
    expect(easeTo.mock.calls.at(-1)?.[0]).not.toHaveProperty("zoom")
  })

  it("keeps top-down follow camera pitch and bearing at zero", async () => {
    const { rerender } = render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        followPosition
        riderPosition={{ lat: 37.82, lng: -122.42 }}
        viewMode="perspective"
      />
    )
    easeTo.mockClear()

    rerender(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        followPosition
        riderPosition={{ lat: 37.82, lng: -122.42 }}
        viewMode="top-down"
      />
    )

    await waitFor(() =>
      expect(easeTo).toHaveBeenCalledWith(
        expect.objectContaining({
          bearing: 0,
          pitch: 0,
        })
      )
    )
  })
})
