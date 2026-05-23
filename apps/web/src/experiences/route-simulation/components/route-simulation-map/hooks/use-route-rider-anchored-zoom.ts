import { useCallback, useEffect, useRef } from "react"
import {
  PERSPECTIVE_FOLLOW_OFFSET_PX,
  PERSPECTIVE_ZOOM_FLOOR,
  ROUTE_WHEEL_ZOOM_SCALE,
} from "../constants"
import { clamp, getPerspectivePitch } from "../utils"
import type { RefObject } from "react"
import type { MapRef } from "@vis.gl/react-maplibre"
import type { RouteMapViewMode } from "@/experiences/route-simulation/types"
import type { RoutePosition } from "@/lib/routes/types"
import type { RiderRenderedPositionSnapshot } from "../types"

type UseRouteRiderAnchoredZoomArgs = {
  followPosition: boolean
  getCurrentCameraBearing: () => number
  getLatestRenderedRiderSnapshot: () => RiderRenderedPositionSnapshot | null
  getPerspectiveTerrainElevation: (
    position: RoutePosition
  ) => number | undefined
  mapRef: RefObject<MapRef | null>
  riderGradePercent: number
  riderPosition: RoutePosition | null
  syncPerspectiveCameraElevation: (
    positionOverride?: RoutePosition | null
  ) => void
  terrainEnabled: boolean
  viewMode: RouteMapViewMode
}

type MapZoomBounds = {
  getMaxZoom: () => number
  getMinZoom: () => number
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
  const zoomBounds: MapZoomBounds = map
  return {
    minZoom: zoomBounds.getMinZoom(),
    maxZoom: zoomBounds.getMaxZoom(),
  }
}

const getWheelListenerMap = (mapRef: MapRef) =>
  mapRef.getMap() as WheelListenerMap

export const useRouteRiderAnchoredZoom = ({
  followPosition,
  getCurrentCameraBearing,
  getLatestRenderedRiderSnapshot,
  getPerspectiveTerrainElevation,
  mapRef,
  riderGradePercent,
  riderPosition,
  syncPerspectiveCameraElevation,
  terrainEnabled,
  viewMode,
}: UseRouteRiderAnchoredZoomArgs) => {
  const previousBearingRef = useRef(0)

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      const map = mapRef.current
      const anchorPosition =
        getLatestRenderedRiderSnapshot()?.position ?? riderPosition
      if (
        !map ||
        !followPosition ||
        !anchorPosition ||
        !isZoomWheelEvent(event)
      ) {
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
          center: [anchorPosition.lng, anchorPosition.lat],
          zoom: nextZoom,
          pitch: 0,
          bearing: 0,
        })
        return
      }

      const bearing = getCurrentCameraBearing()
      previousBearingRef.current = bearing

      const perspectiveZoom = Math.max(nextZoom, PERSPECTIVE_ZOOM_FLOOR)
      const pitch = getPerspectivePitch(
        perspectiveZoom,
        riderGradePercent,
        terrainEnabled
      )
      const elevation = getPerspectiveTerrainElevation(anchorPosition)

      const options = {
        center: [anchorPosition.lng, anchorPosition.lat],
        ...(elevation !== undefined ? { elevation } : {}),
        offset: PERSPECTIVE_FOLLOW_OFFSET_PX,
        zoom: perspectiveZoom,
        pitch,
        bearing,
        freezeElevation: false,
      }
      map.jumpTo(options as unknown as Parameters<typeof map.jumpTo>[0])
      syncPerspectiveCameraElevation(anchorPosition)
    },
    [
      followPosition,
      getCurrentCameraBearing,
      getLatestRenderedRiderSnapshot,
      getPerspectiveTerrainElevation,
      mapRef,
      riderGradePercent,
      riderPosition,
      syncPerspectiveCameraElevation,
      terrainEnabled,
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
