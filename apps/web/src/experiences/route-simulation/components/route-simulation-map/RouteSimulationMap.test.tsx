import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RouteSimulationMap } from "./RouteSimulationMap"
import type { PropsWithChildren } from "react"
import type { FeatureCollection, LineString } from "geojson"
import type { ParsedRouteGpx } from "@/lib/routes/types"

const useTheme = vi.fn()
const easeTo = vi.fn()
const flyTo = vi.fn()
const fitBounds = vi.fn()
const jumpTo = vi.fn()
const queryTerrainElevation = vi.fn()
const resize = vi.fn()
const scrollZoomDisable = vi.fn()
const scrollZoomEnable = vi.fn()
const setElevation = vi.fn()
const setTerrain = vi.fn()
const setRiderData = vi.fn()
const sourceIds = new Set<string>()
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
        onSourceData,
        scrollZoom,
        sky,
      }: PropsWithChildren<{
        onClick?: (event: { lngLat: { lat: number; lng: number } }) => void
        onLoad?: () => void
        onSourceData?: (event: { sourceId: string }) => void
        scrollZoom?: boolean
        sky?: unknown
      }>,
      ref
    ) => {
      const mapElementRef = useRef<HTMLDivElement>(null)
      clickHandler = onClick ?? (() => {})
      useImperativeHandle(ref, () => ({
        easeTo,
        flyTo,
        fitBounds,
        jumpTo,
        getMaxZoom: () => 20,
        getMinZoom: () => 2,
        getMap: () => ({
          getCanvasContainer: () => mapElementRef.current,
          getSource: (id: string) => {
            if (id === "route-rider" && sourceIds.has(id)) {
              return { setData: setRiderData }
            }
            return sourceIds.has(id)
          },
          scrollZoom: {
            disable: scrollZoomDisable,
            enable: scrollZoomEnable,
          },
          setTerrain,
          transform: {
            setElevation,
          },
          triggerRepaint: vi.fn(),
        }),
        getZoom: () => 16,
        queryTerrainElevation,
        resize,
      }))

      useEffect(() => {
        onLoad?.()
        onSourceData?.({ sourceId: "route-terrain-dem" })
      }, [onLoad, onSourceData])

      return (
        <div
          ref={mapElementRef}
          data-testid="map"
          data-scroll-zoom={String(scrollZoom)}
          data-sky={JSON.stringify(sky ?? null)}
        >
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
  }>) => {
    sourceIds.add(id)
    return (
      <div
        data-testid={`source-${id}`}
        data-source-type={type}
        data-source-data={JSON.stringify(data ?? null)}
      >
        {children}
      </div>
    )
  },
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

const makeRoute = (points: ParsedRouteGpx["points"]): ParsedRouteGpx => ({
  ...route,
  points,
  geojson: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: points.map((point) => [point.lng, point.lat]),
        },
      },
    ],
  } as FeatureCollection<LineString>,
  bounds: {
    minLat: Math.min(...points.map((point) => point.lat)),
    minLng: Math.min(...points.map((point) => point.lng)),
    maxLat: Math.max(...points.map((point) => point.lat)),
    maxLng: Math.max(...points.map((point) => point.lng)),
  },
  start: points[0],
  finish: points.at(-1) ?? points[0],
})

describe("RouteSimulationMap", () => {
  beforeEach(() => {
    useTheme.mockReturnValue({ theme: "light" })
    easeTo.mockClear()
    flyTo.mockClear()
    fitBounds.mockClear()
    jumpTo.mockClear()
    queryTerrainElevation.mockReset()
    queryTerrainElevation.mockReturnValue(null)
    resize.mockClear()
    scrollZoomDisable.mockClear()
    scrollZoomEnable.mockClear()
    setElevation.mockClear()
    setTerrain.mockClear()
    setRiderData.mockClear()
    sourceIds.clear()
  })

  it("renders terrain when enabled and keeps rider layers in the simulation map", () => {
    render(
      <RouteSimulationMap
        follow={false}
        onRouteClick={vi.fn()}
        presentation={{ terrainEnabled: true, viewMode: "top-down" }}
        riderDistanceMeters={500}
        riderGradePercent={0}
        riderPosition={{ lat: 37.85, lng: -122.45 }}
        route={route}
      />
    )

    expect(
      screen
        .getByTestId("source-route-terrain-dem")
        .getAttribute("data-source-type")
    ).toBe("raster-dem")
    expect(
      screen.getByTestId("source-route-rider").getAttribute("data-source-type")
    ).toBe("geojson")
    expect(setTerrain).toHaveBeenCalledWith({
      source: "route-terrain-dem",
      exaggeration: 2,
    })
  })

  it("uses perspective follow camera behavior", async () => {
    render(
      <RouteSimulationMap
        follow
        onRouteClick={vi.fn()}
        presentation={{ terrainEnabled: false, viewMode: "perspective" }}
        riderDistanceMeters={500}
        riderGradePercent={4}
        riderPosition={{ lat: 37.85, lng: -122.45 }}
        route={route}
      />
    )

    await waitFor(() => {
      expect(jumpTo).toHaveBeenCalledWith(
        expect.objectContaining({
          center: [expect.closeTo(-122.45), expect.closeTo(37.85)],
          bearing: expect.any(Number),
          pitch: expect.any(Number),
          freezeElevation: false,
        })
      )
    })
    expect(flyTo).not.toHaveBeenCalled()
    expect(easeTo).not.toHaveBeenCalledWith(
      expect.objectContaining({ duration: 0 })
    )
  })

  it("keeps top-down wheel zoom anchored on the rider while following", async () => {
    render(
      <RouteSimulationMap
        follow
        onRouteClick={vi.fn()}
        presentation={{ terrainEnabled: false, viewMode: "top-down" }}
        riderDistanceMeters={500}
        riderGradePercent={0}
        riderPosition={{ lat: 37.85, lng: -122.45 }}
        route={route}
      />
    )

    await waitFor(() => {
      expect(scrollZoomDisable).toHaveBeenCalled()
    })
    easeTo.mockClear()
    jumpTo.mockClear()

    fireEvent.wheel(screen.getByTestId("map"), { deltaY: -50 })

    const riderCoordinates =
      setRiderData.mock.calls.at(-1)?.[0].features[0].geometry.coordinates
    expect(screen.getByTestId("map").getAttribute("data-scroll-zoom")).toBe(
      "false"
    )
    expect(jumpTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: riderCoordinates,
        zoom: 16.5,
        pitch: 0,
        bearing: 0,
      })
    )
    expect(easeTo).not.toHaveBeenCalled()
  })

  it("keeps perspective wheel zoom anchored on the rendered rider while following", async () => {
    render(
      <RouteSimulationMap
        follow
        onRouteClick={vi.fn()}
        presentation={{ terrainEnabled: false, viewMode: "perspective" }}
        riderDistanceMeters={500}
        riderGradePercent={4}
        riderPosition={{ lat: 37.8, lng: -122.4 }}
        route={route}
      />
    )

    await waitFor(() => {
      expect(setRiderData).toHaveBeenCalled()
    })
    easeTo.mockClear()
    jumpTo.mockClear()

    fireEvent.wheel(screen.getByTestId("map"), { deltaY: -25 })

    const riderCoordinates =
      setRiderData.mock.calls.at(-1)?.[0].features[0].geometry.coordinates
    expect(jumpTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: riderCoordinates,
        offset: [0, 140],
        zoom: 16.25,
        pitch: expect.any(Number),
        bearing: expect.any(Number),
        freezeElevation: false,
      })
    )
    expect(easeTo).not.toHaveBeenCalled()
  })

  it("preserves the current smoothed camera bearing during perspective wheel zoom", async () => {
    let currentTimeMs = 0
    let nextFrameId = 1
    const frameCallbacks = new Map<number, FrameRequestCallback>()
    const requestAnimationFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        const frameId = nextFrameId
        nextFrameId += 1
        frameCallbacks.set(frameId, callback)
        return frameId
      })
    const cancelAnimationFrameSpy = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation((frameId) => {
        frameCallbacks.delete(frameId)
      })
    const performanceNowSpy = vi
      .spyOn(performance, "now")
      .mockImplementation(() => currentTimeMs)
    const flushAnimationFrame = (timestampMs: number) => {
      currentTimeMs = timestampMs
      const callbacks = Array.from(frameCallbacks.entries())
      frameCallbacks.clear()
      callbacks.forEach(([, callback]) => callback(timestampMs))
    }
    const turningRoute = makeRoute([
      { lat: 0, lng: 0, elevationMeters: 0, distanceMeters: 0 },
      { lat: 0, lng: 1, elevationMeters: 0, distanceMeters: 100 },
      { lat: 1, lng: 1, elevationMeters: 0, distanceMeters: 200 },
    ])

    try {
      const { rerender } = render(
        <RouteSimulationMap
          follow
          onRouteClick={vi.fn()}
          presentation={{ terrainEnabled: false, viewMode: "perspective" }}
          riderDistanceMeters={90}
          riderGradePercent={0}
          riderPosition={{ lat: 0, lng: 0.9 }}
          route={turningRoute}
        />
      )

      flushAnimationFrame(0)
      await waitFor(() => {
        expect(jumpTo.mock.calls.at(-1)?.[0].bearing).toBeCloseTo(90)
      })

      currentTimeMs = 100
      rerender(
        <RouteSimulationMap
          follow
          onRouteClick={vi.fn()}
          presentation={{ terrainEnabled: false, viewMode: "perspective" }}
          riderDistanceMeters={110}
          riderGradePercent={0}
          riderPosition={{ lat: 0.1, lng: 1 }}
          route={turningRoute}
        />
      )

      flushAnimationFrame(116)
      flushAnimationFrame(232)
      flushAnimationFrame(348)

      const currentCameraBearing = jumpTo.mock.calls.at(-1)?.[0].bearing
      expect(currentCameraBearing).toBeGreaterThan(0)
      expect(currentCameraBearing).toBeLessThan(90)

      jumpTo.mockClear()
      fireEvent.wheel(screen.getByTestId("map"), { deltaY: -25 })

      expect(jumpTo.mock.calls.at(-1)?.[0].bearing).toBeCloseTo(
        currentCameraBearing
      )
    } finally {
      requestAnimationFrameSpy.mockRestore()
      cancelAnimationFrameSpy.mockRestore()
      performanceNowSpy.mockRestore()
    }
  })

  it("leaves MapLibre scroll zoom enabled when follow is disabled", async () => {
    render(
      <RouteSimulationMap
        follow={false}
        onRouteClick={vi.fn()}
        presentation={{ terrainEnabled: false, viewMode: "top-down" }}
        riderDistanceMeters={500}
        riderGradePercent={0}
        riderPosition={{ lat: 37.85, lng: -122.45 }}
        route={route}
      />
    )

    await waitFor(() => {
      expect(scrollZoomEnable).toHaveBeenCalled()
    })
    easeTo.mockClear()
    jumpTo.mockClear()

    fireEvent.wheel(screen.getByTestId("map"), { deltaY: -50 })

    expect(screen.getByTestId("map").getAttribute("data-scroll-zoom")).toBe(
      "true"
    )
    expect(scrollZoomDisable).not.toHaveBeenCalled()
    expect(easeTo).not.toHaveBeenCalled()
    expect(jumpTo).not.toHaveBeenCalled()
  })

  it("uses the rendered rider position for perspective follow movement", async () => {
    const { rerender } = render(
      <RouteSimulationMap
        follow
        onRouteClick={vi.fn()}
        presentation={{ terrainEnabled: false, viewMode: "perspective" }}
        riderDistanceMeters={0}
        riderGradePercent={0}
        riderPosition={{ lat: 37.8, lng: -122.4 }}
        route={route}
      />
    )

    await waitFor(() => {
      expect(setRiderData).toHaveBeenCalled()
    })
    easeTo.mockClear()
    flyTo.mockClear()
    jumpTo.mockClear()

    rerender(
      <RouteSimulationMap
        follow
        onRouteClick={vi.fn()}
        presentation={{ terrainEnabled: false, viewMode: "perspective" }}
        riderDistanceMeters={20}
        riderGradePercent={0}
        riderPosition={{ lat: 37.802, lng: -122.402 }}
        route={route}
      />
    )

    await waitFor(() => {
      const riderCoordinates =
        setRiderData.mock.calls.at(-1)?.[0].features[0].geometry.coordinates
      const cameraCenter = jumpTo.mock.calls.at(-1)?.[0].center

      expect(riderCoordinates).toBeDefined()
      expect(cameraCenter).toEqual(riderCoordinates)
      expect(cameraCenter).not.toEqual([-122.402, 37.802])
    })
    expect(flyTo).not.toHaveBeenCalled()
    expect(easeTo.mock.calls.some(([options]) => options.duration !== 0)).toBe(
      false
    )
    expect(easeTo.mock.calls.some(([options]) => options.duration === 0)).toBe(
      false
    )
  })

  it("uses flyTo for view mode transitions and immediate follow after the transition", async () => {
    const { rerender } = render(
      <RouteSimulationMap
        follow
        onRouteClick={vi.fn()}
        presentation={{ terrainEnabled: false, viewMode: "top-down" }}
        riderDistanceMeters={0}
        riderGradePercent={0}
        riderPosition={{ lat: 37.8, lng: -122.4 }}
        route={route}
      />
    )

    await waitFor(() => {
      expect(easeTo).toHaveBeenCalled()
    })
    easeTo.mockClear()
    flyTo.mockClear()
    jumpTo.mockClear()

    rerender(
      <RouteSimulationMap
        follow
        onRouteClick={vi.fn()}
        presentation={{ terrainEnabled: false, viewMode: "perspective" }}
        riderDistanceMeters={0}
        riderGradePercent={0}
        riderPosition={{ lat: 37.8, lng: -122.4 }}
        route={route}
      />
    )

    await waitFor(() => {
      expect(flyTo).toHaveBeenCalledWith(
        expect.objectContaining({
          center: [-122.4, 37.8],
          offset: [0, 140],
          pitch: expect.any(Number),
        })
      )
    })
    easeTo.mockClear()
    flyTo.mockClear()

    rerender(
      <RouteSimulationMap
        follow
        onRouteClick={vi.fn()}
        presentation={{ terrainEnabled: false, viewMode: "perspective" }}
        riderDistanceMeters={10}
        riderGradePercent={0}
        riderPosition={{ lat: 37.801, lng: -122.401 }}
        route={route}
      />
    )

    await waitFor(() => {
      expect(jumpTo).toHaveBeenCalledWith(
        expect.objectContaining({
          center: expect.any(Array),
          freezeElevation: false,
        })
      )
    })
    expect(flyTo).not.toHaveBeenCalled()
    expect(easeTo.mock.calls.some(([options]) => options.duration !== 0)).toBe(
      false
    )
    expect(easeTo.mock.calls.some(([options]) => options.duration === 0)).toBe(
      false
    )
  })

  it("snaps marker and camera together on large seeks", async () => {
    const { rerender } = render(
      <RouteSimulationMap
        follow
        onRouteClick={vi.fn()}
        presentation={{ terrainEnabled: false, viewMode: "perspective" }}
        riderDistanceMeters={0}
        riderGradePercent={0}
        riderPosition={{ lat: 37.8, lng: -122.4 }}
        route={route}
      />
    )

    await waitFor(() => {
      expect(setRiderData).toHaveBeenCalled()
    })
    easeTo.mockClear()
    flyTo.mockClear()
    jumpTo.mockClear()

    rerender(
      <RouteSimulationMap
        follow
        onRouteClick={vi.fn()}
        presentation={{ terrainEnabled: false, viewMode: "perspective" }}
        riderDistanceMeters={100}
        riderGradePercent={0}
        riderPosition={{ lat: 37.81, lng: -122.41 }}
        route={route}
      />
    )

    await waitFor(() => {
      const riderCoordinates =
        setRiderData.mock.calls.at(-1)?.[0].features[0].geometry.coordinates
      expect(riderCoordinates[0]).toBeCloseTo(-122.41)
      expect(riderCoordinates[1]).toBeCloseTo(37.81)
      expect(jumpTo.mock.calls.at(-1)?.[0].center).toEqual(riderCoordinates)
    })
    expect(flyTo).not.toHaveBeenCalled()
    expect(easeTo.mock.calls.some(([options]) => options.duration !== 0)).toBe(
      false
    )
    expect(easeTo.mock.calls.some(([options]) => options.duration === 0)).toBe(
      false
    )
  })

  it("does not render the rider ahead of the latest distance sample", async () => {
    let currentTimeMs = 0
    let nextFrameId = 1
    const frameCallbacks = new Map<number, FrameRequestCallback>()
    const requestAnimationFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        const frameId = nextFrameId
        nextFrameId += 1
        frameCallbacks.set(frameId, callback)
        return frameId
      })
    const cancelAnimationFrameSpy = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation((frameId) => {
        frameCallbacks.delete(frameId)
      })
    const performanceNowSpy = vi
      .spyOn(performance, "now")
      .mockImplementation(() => currentTimeMs)
    const flushAnimationFrame = (timestampMs: number) => {
      currentTimeMs = timestampMs
      const callbacks = Array.from(frameCallbacks.entries())
      frameCallbacks.clear()
      callbacks.forEach(([, callback]) => callback(timestampMs))
    }
    const linearRoute = makeRoute([
      { lat: 0, lng: 0, elevationMeters: 0, distanceMeters: 0 },
      { lat: 0, lng: 1, elevationMeters: 0, distanceMeters: 100 },
    ])

    try {
      const { rerender } = render(
        <RouteSimulationMap
          follow
          onRouteClick={vi.fn()}
          presentation={{ terrainEnabled: false, viewMode: "perspective" }}
          riderDistanceMeters={0}
          riderGradePercent={0}
          riderPosition={{ lat: 0, lng: 0 }}
          route={linearRoute}
        />
      )

      flushAnimationFrame(0)
      currentTimeMs = 1000
      rerender(
        <RouteSimulationMap
          follow
          onRouteClick={vi.fn()}
          presentation={{ terrainEnabled: false, viewMode: "perspective" }}
          riderDistanceMeters={10}
          riderGradePercent={0}
          riderPosition={{ lat: 0, lng: 0.1 }}
          route={linearRoute}
        />
      )

      flushAnimationFrame(2000)

      const riderLng =
        setRiderData.mock.calls.at(-1)?.[0].features[0].geometry.coordinates[0]
      expect(riderLng).toBeLessThanOrEqual(0.1)
      expect(jumpTo.mock.calls.at(-1)?.[0].center[0]).toBeLessThanOrEqual(0.1)
    } finally {
      requestAnimationFrameSpy.mockRestore()
      cancelAnimationFrameSpy.mockRestore()
      performanceNowSpy.mockRestore()
    }
  })

  it("uses route-distance bearing instead of nearest segment for perspective follow", async () => {
    const overlappingRoute: ParsedRouteGpx = {
      ...route,
      points: [
        { lat: 0, lng: 0, elevationMeters: 0, distanceMeters: 0 },
        { lat: 0, lng: 1, elevationMeters: 0, distanceMeters: 100 },
        { lat: 1, lng: 1, elevationMeters: 0, distanceMeters: 200 },
      ],
      geojson: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [0, 0],
                [1, 0],
                [1, 1],
              ],
            },
          },
        ],
      } as FeatureCollection<LineString>,
      start: { lat: 0, lng: 0 },
      finish: { lat: 1, lng: 1 },
    }

    render(
      <RouteSimulationMap
        follow
        onRouteClick={vi.fn()}
        presentation={{ terrainEnabled: false, viewMode: "perspective" }}
        riderDistanceMeters={150}
        riderGradePercent={0}
        riderPosition={{ lat: 0.5, lng: 1 }}
        route={overlappingRoute}
      />
    )

    await waitFor(() => {
      expect(jumpTo.mock.calls.at(-1)?.[0].bearing).toBeCloseTo(0)
    })
  })

  it("syncs perspective terrain elevation from the current rendered rider frame", async () => {
    queryTerrainElevation.mockImplementation(([lng, lat]: [number, number]) =>
      lng < -122.405 && lat > 37.805 ? 222 : 111
    )

    render(
      <RouteSimulationMap
        follow
        onRouteClick={vi.fn()}
        presentation={{ terrainEnabled: true, viewMode: "perspective" }}
        riderDistanceMeters={100}
        riderGradePercent={0}
        riderPosition={{ lat: 37.81, lng: -122.41 }}
        route={route}
      />
    )

    await waitFor(() => {
      expect(jumpTo.mock.calls.at(-1)?.[0]).toEqual(
        expect.objectContaining({
          center: [expect.closeTo(-122.41), expect.closeTo(37.81)],
          elevation: 222,
        })
      )
      expect(setElevation).toHaveBeenLastCalledWith(222)
    })
  })

  it("interpolates rider distance and wires route clicks", async () => {
    const onRouteClick = vi.fn()
    render(
      <RouteSimulationMap
        follow={false}
        onRouteClick={onRouteClick}
        presentation={{ terrainEnabled: false, viewMode: "top-down" }}
        riderDistanceMeters={500}
        riderGradePercent={0}
        riderPosition={{ lat: 37.8, lng: -122.4 }}
        route={route}
      />
    )

    await waitFor(() => {
      expect(setRiderData).toHaveBeenCalled()
    })
    expect(
      setRiderData.mock.calls.at(-1)?.[0].features[0].geometry.coordinates
    ).toEqual([-122.45, 37.849999999999994])

    act(() => {
      clickHandler({ lngLat: { lat: 38, lng: -123 } })
    })

    expect(onRouteClick).toHaveBeenCalledWith({ lat: 38, lng: -123 })
  })
})
