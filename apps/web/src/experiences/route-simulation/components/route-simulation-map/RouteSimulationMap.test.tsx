import { act, render, screen, waitFor } from "@testing-library/react"
import { forwardRef, useEffect, useImperativeHandle } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RouteSimulationMap } from "./RouteSimulationMap"
import type { PropsWithChildren } from "react"
import type { FeatureCollection, LineString } from "geojson"
import type { ParsedRouteGpx } from "@/lib/routes/types"

const useTheme = vi.fn()
const easeTo = vi.fn()
const flyTo = vi.fn()
const fitBounds = vi.fn()
const queryTerrainElevation = vi.fn()
const resize = vi.fn()
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
        sky,
      }: PropsWithChildren<{
        onClick?: (event: { lngLat: { lat: number; lng: number } }) => void
        onLoad?: () => void
        onSourceData?: (event: { sourceId: string }) => void
        sky?: unknown
      }>,
      ref
    ) => {
      clickHandler = onClick ?? (() => {})
      useImperativeHandle(ref, () => ({
        easeTo,
        flyTo,
        fitBounds,
        getMap: () => ({
          getSource: (id: string) => {
            if (id === "route-rider" && sourceIds.has(id)) {
              return { setData: setRiderData }
            }
            return sourceIds.has(id)
          },
          setTerrain,
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

describe("RouteSimulationMap", () => {
  beforeEach(() => {
    useTheme.mockReturnValue({ theme: "light" })
    easeTo.mockClear()
    flyTo.mockClear()
    fitBounds.mockClear()
    queryTerrainElevation.mockReset()
    queryTerrainElevation.mockReturnValue(null)
    resize.mockClear()
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
      expect(easeTo).toHaveBeenCalledWith(
        expect.objectContaining({
          center: [-122.45, 37.85],
          bearing: expect.any(Number),
          pitch: expect.any(Number),
          freezeElevation: false,
        })
      )
    })
    expect(flyTo).not.toHaveBeenCalled()
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
      const cameraCenter = easeTo.mock.calls.at(-1)?.[0].center

      expect(riderCoordinates).toBeDefined()
      expect(cameraCenter).toEqual(riderCoordinates)
      expect(cameraCenter).not.toEqual([-122.402, 37.802])
    })
    expect(flyTo).not.toHaveBeenCalled()
  })

  it("uses flyTo for view mode transitions and easeTo after the transition", async () => {
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
      expect(easeTo).toHaveBeenCalled()
    })
    expect(flyTo).not.toHaveBeenCalled()
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
      expect(easeTo.mock.calls.at(-1)?.[0].center).toEqual(riderCoordinates)
    })
    expect(flyTo).not.toHaveBeenCalled()
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
