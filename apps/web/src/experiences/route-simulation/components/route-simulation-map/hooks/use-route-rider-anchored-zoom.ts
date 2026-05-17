import { useCallback, useEffect, useMemo, useRef } from "react"
import type { RefObject } from "react"
import type { MapRef } from "@vis.gl/react-maplibre"
import type { FeatureCollection, LineString } from "geojson"
import type { RouteMapViewMode } from "@/experiences/route-simulation/types"
import type { RoutePosition } from "@/lib/routes/types"
import {
  CAMERA_WHEEL_ZOOM_DURATION_MS,
  PERSPECTIVE_FOLLOW_OFFSET_PX,
  PERSPECTIVE_ZOOM_FLOOR,
  ROUTE_MAX_ZOOM,
  ROUTE_MIN_ZOOM,
  ROUTE_WHEEL_ZOOM_SCALE,
} from "../constants"
import {
  buildRouteBearingSegments,
  clamp,
  computeRouteBearingNearPosition,
  getPerspectivePitch,
} from "../utils"

type UseRouteRiderAnchoredZoomArgs = {
  followPosition: boolean
  geojson: FeatureCollection<LineString>
  getPerspectiveTerrainElevation: (
    position: RoutePosition
  ) => number | undefined
  mapRef: RefObject<MapRef | null>
  riderGradePercent: number
  riderPosition: RoutePosition | null
  syncPerspectiveCameraElevation: () => void
  viewMode: RouteMapViewMode
}

type MapZoomBounds = {
  getMaxZoom?: () => number
  getMinZoom?: () => number
}

type ScrollZoomHandler = {
  disable?: () => void
  enable?: () => void
}

type WheelListenerMap = {
  getCanvasContainer?: () => HTMLElement
  scrollZoom?: ScrollZoomHandler
}

const isZoomWheelEvent = (event: WheelEvent) =>
  Number.isFinite(event.deltaY) && event.deltaY !== 0

const getMapZoomBounds = (map: MapRef) => {
  const zoomBounds = map as MapRef & MapZoomBounds
  return {
    minZoom: zoomBounds.getMinZoom?.() ?? ROUTE_MIN_ZOOM,
    maxZoom: zoomBounds.getMaxZoom?.() ?? ROUTE_MAX_ZOOM,
  }
}

const getWheelListenerMap = (mapRef: MapRef) =>
  mapRef.getMap() as WheelListenerMap

export const useRouteRiderAnchoredZoom = ({
  followPosition,
  geojson,
  getPerspectiveTerrainElevation,
  mapRef,
  riderGradePercent,
  riderPosition,
  syncPerspectiveCameraElevation,
  viewMode,
}: UseRouteRiderAnchoredZoomArgs) => {
  const previousBearingRef = useRef(0)
  const routeBearingSegments = useMemo(
    () => buildRouteBearingSegments(geojson),
    [geojson]
  )

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      const map = mapRef.current
      if (!map || !followPosition || !riderPosition || !isZoomWheelEvent(event)) {
        return
      }

      event.preventDefault()

      const currentZoom = map.getZoom()
      const { minZoom, maxZoom } = getMapZoomBounds(map)
      const nextZoom = clamp(
        currentZoom - event.deltaY * ROUTE_WHEEL_ZOOM_SCALE,
        minZoom,
        maxZoom
      )

      if (viewMode === "top-down") {
        previousBearingRef.current = 0
        map.jumpTo({
          center: [riderPosition.lng, riderPosition.lat],
          zoom: nextZoom,
          pitch: 0,
          bearing: 0,
        })
        return
      }

      const bearing =
        computeRouteBearingNearPosition(routeBearingSegments, riderPosition) ??
        previousBearingRef.current
      previousBearingRef.current = bearing

      const perspectiveZoom = Math.max(nextZoom, PERSPECTIVE_ZOOM_FLOOR)
      const pitch = getPerspectivePitch(perspectiveZoom, riderGradePercent)
      const elevation = getPerspectiveTerrainElevation(riderPosition)

      map.easeTo({
        center: [riderPosition.lng, riderPosition.lat],
        ...(elevation !== undefined ? { elevation } : {}),
        offset: PERSPECTIVE_FOLLOW_OFFSET_PX,
        zoom: perspectiveZoom,
        pitch,
        bearing,
        duration: CAMERA_WHEEL_ZOOM_DURATION_MS,
        freezeElevation: false,
      })
      syncPerspectiveCameraElevation()
    },
    [
      followPosition,
      getPerspectiveTerrainElevation,
      mapRef,
      riderGradePercent,
      riderPosition,
      routeBearingSegments,
      syncPerspectiveCameraElevation,
      viewMode,
    ]
  )

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const mapInstance = getWheelListenerMap(map)

    if (followPosition) {
      mapInstance.scrollZoom?.disable?.()
    } else {
      mapInstance.scrollZoom?.enable?.()
    }

    return () => {
      if (followPosition) {
        mapInstance.scrollZoom?.enable?.()
      }
    }
  }, [followPosition, mapRef])

  useEffect(() => {
    if (!followPosition) return

    const map = mapRef.current
    if (!map) return

    const canvasContainer = getWheelListenerMap(map).getCanvasContainer?.()
    canvasContainer?.addEventListener("wheel", handleWheel, {
      passive: false,
    })

    return () => {
      canvasContainer?.removeEventListener("wheel", handleWheel)
    }
  }, [followPosition, handleWheel, mapRef])

  return { handleWheel }
}
