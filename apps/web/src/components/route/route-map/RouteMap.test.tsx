import { act, render, screen, waitFor } from "@testing-library/react"
import { forwardRef, useEffect, useImperativeHandle } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RouteMap } from "./RouteMap"
import type { PropsWithChildren } from "react"
import type { FeatureCollection, LineString } from "geojson"

const useTheme = vi.fn()
const easeTo = vi.fn()
const flyTo = vi.fn()
const fitBounds = vi.fn()
const queryTerrainElevation = vi.fn()
const resize = vi.fn()
const setTerrain = vi.fn()
const setTransformElevation = vi.fn()
const triggerRepaint = vi.fn()
const setRiderData = vi.fn()
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
        centerClampedToGround,
        mapStyle,
        maxPitch,
        sky,
        onIdle,
        onLoad,
        onMoveEnd,
        onSourceData,
      }: PropsWithChildren<{
        centerClampedToGround?: boolean
        mapStyle: string
        maxPitch?: number
        sky?: unknown
        onIdle?: () => void
        onLoad?: () => void
        onMoveEnd?: () => void
        onSourceData?: (event: { sourceId: string }) => void
      }>,
      ref
    ) => {
      useImperativeHandle(ref, () => ({
        easeTo,
        flyTo,
        fitBounds,
        getMap: () => ({
          _elevationFreeze: true,
          getSource: (id: string) => {
            if (id === "route-rider" && sourceIds.has(id)) {
              return { setData: setRiderData }
            }

            return sourceIds.has(id)
          },
          setTerrain,
          transform: {
            setElevation: setTransformElevation,
          },
          triggerRepaint,
        }),
        getZoom: () => mapZoom,
        queryTerrainElevation,
        resize,
      }))

      useEffect(() => {
        onLoad?.()
        onSourceData?.({ sourceId: "route-terrain-dem" })
        onMoveEnd?.()
        onIdle?.()
      }, [onIdle, onLoad, onMoveEnd, onSourceData])

      return (
        <div
          data-testid="map"
          data-center-clamped-to-ground={String(centerClampedToGround)}
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
    data,
    tileSize,
    tiles,
    type,
    url,
  }: PropsWithChildren<{
    attribution?: string
    encoding?: string
    id: string
    maxzoom?: number
    data?: unknown
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
        data-source-data={JSON.stringify(data ?? null)}
        data-tile-size={tileSize}
        data-tiles={JSON.stringify(tiles ?? null)}
        data-url={url}
      >
        {children}
      </div>
    )
  },
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

const routePoints = [
  { lat: 0, lng: 0, elevationMeters: null, distanceMeters: 0 },
  { lat: 0, lng: 1, elevationMeters: null, distanceMeters: 100 },
  { lat: 1, lng: 1, elevationMeters: null, distanceMeters: 200 },
]

const lastRiderCoordinates = () =>
  setRiderData.mock.calls.at(-1)?.[0].features[0]?.geometry.coordinates

describe("RouteMap", () => {
  beforeEach(() => {
    useTheme.mockReturnValue({ theme: "light" })
    easeTo.mockClear()
    flyTo.mockClear()
    fitBounds.mockClear()
    queryTerrainElevation.mockReset()
    queryTerrainElevation.mockReturnValue(null)
    mapZoom = 10
    resize.mockClear()
    setTerrain.mockClear()
    setTransformElevation.mockClear()
    setRiderData.mockClear()
    triggerRepaint.mockClear()
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

  it("renders the rider as a GeoJSON source and map-aligned circle layers", () => {
    render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        riderPosition={{ lat: 37.82, lng: -122.42 }}
      />
    )

    expect(screen.getByTestId("source-route-rider")).toBeTruthy()
    expect(
      JSON.parse(
        screen.getByTestId("source-route-rider").dataset.sourceData ?? "{}"
      )
    ).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [-122.42, 37.82],
          },
        },
      ],
    })
    expect(screen.getByTestId("route-rider-halo").dataset.layerType).toBe(
      "circle"
    )
    expect(
      JSON.parse(
        screen.getByTestId("route-rider-halo").getAttribute("data-paint") ??
          "{}"
      )
    ).toEqual({
      "circle-color": "rgba(255,255,255,0.92)",
      "circle-radius": 14,
      "circle-opacity": 0.9,
      "circle-stroke-color": "rgba(0,0,0,0.24)",
      "circle-stroke-width": 2,
      "circle-pitch-alignment": "map",
    })
    expect(
      JSON.parse(
        screen.getByTestId("route-rider-dot").getAttribute("data-paint") ?? "{}"
      )
    ).toEqual({
      "circle-color": "#4f46e5",
      "circle-radius": 5,
      "circle-pitch-alignment": "map",
    })
  })

  it("omits the rider feature when rider position is null", () => {
    render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        riderPosition={null}
      />
    )

    expect(
      JSON.parse(
        screen.getByTestId("source-route-rider").dataset.sourceData ?? "{}"
      )
    ).toEqual({
      type: "FeatureCollection",
      features: [],
    })
  })

  it("updates rider position through the GeoJSON source instead of a DOM marker", async () => {
    const { rerender } = render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        riderPosition={{ lat: 37.82, lng: -122.42 }}
      />
    )

    setRiderData.mockClear()

    rerender(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        riderPosition={{ lat: 37.83, lng: -122.43 }}
      />
    )

    await waitFor(() => expect(setRiderData).toHaveBeenCalled())
    expect(setRiderData.mock.calls.at(-1)?.[0]).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [-122.43, 37.83],
          },
        },
      ],
    })
    expect(document.querySelector(".size-7")).toBeNull()
  })

  it("renders distance mode at an interpolated route point", async () => {
    render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        riderDistanceMeters={50}
        riderRoutePoints={routePoints}
      />
    )

    await waitFor(() => expect(setRiderData).toHaveBeenCalled())
    expect(lastRiderCoordinates()).toEqual([0.5, 0])
  })

  it("distance mode follows route geometry instead of straight-line lat/lng", async () => {
    const { rerender } = render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        riderDistanceMeters={100}
        riderRoutePoints={routePoints}
      />
    )

    setRiderData.mockClear()

    rerender(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        riderDistanceMeters={150}
        riderRoutePoints={routePoints}
      />
    )

    await waitFor(() => expect(setRiderData).toHaveBeenCalled())
    expect(lastRiderCoordinates()).toEqual([1, 0.5])
  })

  it("animates small distance updates at observed speed", async () => {
    let now = 0
    const nowSpy = vi.spyOn(performance, "now").mockImplementation(() => now)
    const rafCallbacks: Array<FrameRequestCallback> = []
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        rafCallbacks.push(callback)
        return rafCallbacks.length
      })
    const cancelRafSpy = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => {})

    const { rerender } = render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        riderDistanceMeters={0}
        riderRoutePoints={routePoints}
      />
    )

    await waitFor(() => expect(setRiderData).toHaveBeenCalled())
    setRiderData.mockClear()
    rafCallbacks.length = 0
    now = 1000

    rerender(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        riderDistanceMeters={10}
        riderRoutePoints={routePoints}
      />
    )

    expect(rafCallbacks).toHaveLength(1)
    act(() => rafCallbacks[0]?.(1500))
    expect(lastRiderCoordinates()?.[0]).toBeCloseTo(0.05)
    act(() => rafCallbacks[1]?.(2000))
    expect(lastRiderCoordinates()).toEqual([0.1, 0])

    nowSpy.mockRestore()
    rafSpy.mockRestore()
    cancelRafSpy.mockRestore()
  })

  it("snaps distance mode for large jumps", async () => {
    const { rerender } = render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        riderDistanceMeters={0}
        riderRoutePoints={routePoints}
      />
    )

    await waitFor(() => expect(setRiderData).toHaveBeenCalled())
    setRiderData.mockClear()

    rerender(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        riderDistanceMeters={100}
        riderRoutePoints={routePoints}
      />
    )

    await waitFor(() => expect(setRiderData).toHaveBeenCalled())
    expect(setRiderData).toHaveBeenCalledWith({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [1, 0],
          },
        },
      ],
    })
  })

  it("snaps distance mode after a stale target gap", async () => {
    let now = 0
    const nowSpy = vi.spyOn(performance, "now").mockImplementation(() => now)
    const { rerender } = render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        riderDistanceMeters={0}
        riderRoutePoints={routePoints}
      />
    )

    await waitFor(() => expect(setRiderData).toHaveBeenCalled())
    setRiderData.mockClear()
    now = 1001

    rerender(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        riderDistanceMeters={10}
        riderRoutePoints={routePoints}
      />
    )

    await waitFor(() => expect(setRiderData).toHaveBeenCalled())
    expect(lastRiderCoordinates()).toEqual([0.1, 0])
    nowSpy.mockRestore()
  })

  it("clears the rider source when distance mode has no target", async () => {
    const { rerender } = render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        riderDistanceMeters={0}
        riderRoutePoints={routePoints}
      />
    )

    await waitFor(() => expect(setRiderData).toHaveBeenCalled())
    setRiderData.mockClear()

    rerender(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        riderDistanceMeters={null}
        riderRoutePoints={routePoints}
      />
    )

    await waitFor(() => expect(setRiderData).toHaveBeenCalled())
    expect(setRiderData).toHaveBeenCalledWith({
      type: "FeatureCollection",
      features: [],
    })
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
    queryTerrainElevation.mockReturnValue(240)

    render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        followPosition
        riderPosition={{ lat: 37.82, lng: -122.42 }}
        terrainEnabled
        viewMode="perspective"
      />
    )

    await waitFor(() =>
      expect(flyTo).toHaveBeenCalledWith(
        expect.objectContaining({
          center: [-122.42, 37.82],
          elevation: 240,
          offset: [0, 140],
          pitch: 60,
          zoom: 15.5,
          duration: 450,
          curve: 1.2,
          maxDuration: 450,
          freezeElevation: false,
        })
      )
    )
    expect(flyTo.mock.calls.at(-1)?.[0].bearing).not.toBe(0)
    expect(queryTerrainElevation).toHaveBeenCalledWith([-122.42, 37.82])
    expect(setTransformElevation).toHaveBeenCalledWith(240)
    expect(triggerRepaint).toHaveBeenCalled()
    expect(screen.getByTestId("map").dataset.centerClampedToGround).toBe("true")
    expect(screen.getByTestId("map").dataset.maxPitch).toBe("80")
  })

  it("omits perspective follow elevation until terrain tiles are available", async () => {
    queryTerrainElevation.mockReturnValue(null)

    render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        followPosition
        riderPosition={{ lat: 37.82, lng: -122.42 }}
        terrainEnabled
        viewMode="perspective"
      />
    )

    await waitFor(() =>
      expect(flyTo).toHaveBeenCalledWith(
        expect.objectContaining({
          center: [-122.42, 37.82],
          freezeElevation: false,
        })
      )
    )
    expect(flyTo.mock.calls.at(-1)?.[0]).not.toHaveProperty("elevation")
    expect(setTransformElevation).not.toHaveBeenCalled()
  })

  it("reruns perspective follow camera when terrain is enabled", async () => {
    queryTerrainElevation.mockReturnValue(240)

    const { rerender } = render(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        followPosition
        riderPosition={{ lat: 37.82, lng: -122.42 }}
        terrainEnabled={false}
        viewMode="perspective"
      />
    )

    await waitFor(() => expect(flyTo).toHaveBeenCalledTimes(1))

    rerender(
      <RouteMap
        geojson={geojson}
        bounds={null}
        start={null}
        finish={null}
        followPosition
        riderPosition={{ lat: 37.82, lng: -122.42 }}
        terrainEnabled
        viewMode="perspective"
      />
    )

    await waitFor(() => expect(flyTo).toHaveBeenCalledTimes(2))
    expect(flyTo.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        center: [-122.42, 37.82],
        elevation: 240,
        freezeElevation: false,
      })
    )
    expect(queryTerrainElevation).toHaveBeenCalledWith([-122.42, 37.82])
    expect(setTransformElevation).toHaveBeenCalledWith(240)
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
      expect(flyTo).toHaveBeenCalledWith(
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
      expect(flyTo).toHaveBeenCalledWith(
        expect.objectContaining({ pitch: 60, zoom: 15.5 })
      )
    )

    flyTo.mockClear()
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
      expect(flyTo).toHaveBeenCalledWith(
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

    await waitFor(() => expect(flyTo).toHaveBeenCalledTimes(1))

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

    expect(flyTo).toHaveBeenCalledTimes(1)

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

    await waitFor(() => expect(flyTo).toHaveBeenCalledTimes(2))
    expect(flyTo.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        center: [-122.42005, 37.82005],
      })
    )
  })

  it("updates rider source for sub-threshold movement without restarting the follow camera", async () => {
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

    await waitFor(() => expect(flyTo).toHaveBeenCalledTimes(1))
    setRiderData.mockClear()

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

    expect(flyTo).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(setRiderData).toHaveBeenCalled())
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
