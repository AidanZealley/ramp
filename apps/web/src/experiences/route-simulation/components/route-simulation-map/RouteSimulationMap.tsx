import { useCallback, useRef, useState } from "react"
import Map from "@vis.gl/react-maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import type { MapRef } from "@vis.gl/react-maplibre"
import { RouteEndpointMarkers } from "@/components/route/route-map/components/route-endpoint-markers"
import { RouteLineSource } from "@/components/route/route-map/components/route-line-source"
import { RouteRiderSource } from "@/components/route/route-map/components/route-rider-source"
import { useRouteMapStyle } from "@/components/route/route-map/hooks/use-route-map-style"
import { buildRiderGeojson } from "@/components/route/route-map/utils"
import type { RouteMapPresentation } from "@/experiences/route-simulation/types"
import type { ParsedRouteGpx, RoutePosition } from "@/lib/routes/types"
import { RouteTerrainSource } from "./components/route-terrain-source"
import { PERSPECTIVE_MAX_PITCH, ROUTE_PADDING_PX } from "./constants"
import { useRenderedRiderPosition } from "./hooks/use-rendered-rider-position"
import { useRouteCamera } from "./hooks/use-route-camera"
import { useRouteMapBounds } from "./hooks/use-route-map-bounds"
import { useRouteMapTerrain } from "./hooks/use-route-map-terrain"
import { useRouteRiderAnchoredZoom } from "./hooks/use-route-rider-anchored-zoom"
import type { RiderRenderedPositionSnapshot } from "./types"

type RouteSimulationMapProps = {
  followPosition: boolean
  onRouteClick?: (position: RoutePosition) => void
  presentation: RouteMapPresentation
  riderDistanceMeters: number
  riderGradePercent: number
  riderPosition: RoutePosition | null
  route: ParsedRouteGpx
}

export const RouteSimulationMap = ({
  followPosition,
  onRouteClick,
  presentation,
  riderDistanceMeters,
  riderGradePercent,
  riderPosition,
  route,
}: RouteSimulationMapProps) => {
  const { terrainEnabled, viewMode } = presentation

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapRef>(null)
  const initialRiderGeojsonRef = useRef(buildRiderGeojson(riderPosition))

  const [renderedRiderSnapshot, setRenderedRiderSnapshot] =
    useState<RiderRenderedPositionSnapshot | null>(null)

  const effectiveRiderPosition =
    renderedRiderSnapshot?.position ?? riderPosition

  const { colors, mapStyle } = useRouteMapStyle()

  const { fitRouteBounds, initialViewState } = useRouteMapBounds({
    bounds: route.bounds,
    containerRef,
    mapRef,
    padding: ROUTE_PADDING_PX,
    start: route.start,
  })

  const {
    applyTerrain,
    getPerspectiveTerrainElevation,
    handleTerrainSourceData,
    syncPerspectiveCameraElevation,
  } = useRouteMapTerrain({
    followPosition,
    mapRef,
    mapStyle,
    riderPosition: effectiveRiderPosition,
    terrainEnabled,
    viewMode,
  })

  useRenderedRiderPosition({
    mapRef,
    mapStyle,
    onRenderedPositionChange: setRenderedRiderSnapshot,
    riderDistanceMeters,
    routePoints: route.points,
  })
  useRouteCamera({
    followPosition,
    geojson: route.geojson,
    getPerspectiveTerrainElevation,
    mapRef,
    riderGradePercent,
    rawRiderPosition: riderPosition,
    renderedRiderPosition: renderedRiderSnapshot?.position ?? null,
    syncPerspectiveCameraElevation,
    terrainEnabled,
    viewMode,
  })
  useRouteRiderAnchoredZoom({
    followPosition,
    geojson: route.geojson,
    getPerspectiveTerrainElevation,
    mapRef,
    riderGradePercent,
    riderPosition: effectiveRiderPosition,
    syncPerspectiveCameraElevation,
    viewMode,
  })

  const handleCameraStateChange = useCallback(() => {
    syncPerspectiveCameraElevation()
  }, [syncPerspectiveCameraElevation])

  const handleMapIdle = useCallback(() => {
    applyTerrain()
    handleCameraStateChange()
  }, [applyTerrain, handleCameraStateChange])

  const handleMapLoad = useCallback(() => {
    fitRouteBounds()
    window.requestAnimationFrame(applyTerrain)
    window.requestAnimationFrame(handleCameraStateChange)
  }, [applyTerrain, fitRouteBounds, handleCameraStateChange])

  return (
    <div ref={containerRef} className="absolute inset-0 bg-muted">
      <Map
        key={mapStyle}
        ref={mapRef}
        mapStyle={mapStyle}
        initialViewState={initialViewState}
        attributionControl={false}
        centerClampedToGround={true}
        maxPitch={PERSPECTIVE_MAX_PITCH}
        reuseMaps
        scrollZoom={!followPosition}
        sky={
          terrainEnabled || viewMode === "perspective"
            ? {
                "sky-color": "#8ab4f8",
                "sky-horizon-blend": 0.35,
                "horizon-color": "#f8fafc",
                "horizon-fog-blend": 0.55,
                "fog-color": "#f8fafc",
                "fog-ground-blend": 0.35,
              }
            : undefined
        }
        onIdle={handleMapIdle}
        onLoad={handleMapLoad}
        onMoveEnd={handleCameraStateChange}
        onSourceData={handleTerrainSourceData}
        onClick={(event) => {
          onRouteClick?.({
            lat: event.lngLat.lat,
            lng: event.lngLat.lng,
          })
        }}
      >
        {terrainEnabled && <RouteTerrainSource colors={colors} />}
        <RouteLineSource colors={colors} geojson={route.geojson} />
        <RouteRiderSource
          colors={colors}
          initialData={initialRiderGeojsonRef.current}
        />
        <RouteEndpointMarkers
          colors={colors}
          start={route.start}
          finish={route.finish}
        />
      </Map>
    </div>
  )
}
