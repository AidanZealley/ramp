import { useEffect, useMemo, useRef } from "react"
import type { RefObject } from "react"
import type { MapRef } from "@vis.gl/react-maplibre"
import type { FeatureCollection, LineString } from "geojson"
import type {
  RouteMapViewMode,
} from "@/experiences/route-simulation/types"
import type { RoutePosition } from "@/lib/routes/types"
import {
  CAMERA_DURATION_MS,
  PERSPECTIVE_FOLLOW_OFFSET_PX,
  PERSPECTIVE_ZOOM_FLOOR,
} from "../constants"
import type { CameraTarget } from "../types"
import {
  buildRouteBearingSegments,
  computeRouteBearingNearPosition,
  getPerspectivePitch,
  shouldUpdateCamera,
} from "../utils"

type UseRouteCameraArgs = {
  followPosition: boolean
  geojson: FeatureCollection<LineString>
  getPerspectiveTerrainElevation: (
    position: RoutePosition
  ) => number | undefined
  mapRef: RefObject<MapRef | null>
  riderGradePercent: number
  riderPosition: RoutePosition | null
  syncPerspectiveCameraElevation: () => void
  terrainEnabled: boolean
  viewMode: RouteMapViewMode
}

const buildTopDownCameraTarget = ({
  followPosition,
  riderPosition,
  terrainEnabled,
  viewMode,
}: Pick<
  UseRouteCameraArgs,
  "followPosition" | "riderPosition" | "terrainEnabled" | "viewMode"
>): CameraTarget => ({
  ...(followPosition && riderPosition
    ? { center: [riderPosition.lng, riderPosition.lat] as [number, number] }
    : {}),
  bearing: 0,
  followPosition,
  pitch: 0,
  terrainEnabled,
  viewMode,
})

const buildPerspectiveCameraTarget = ({
  bearing,
  center,
  followPosition,
  pitch,
  terrainEnabled,
  viewMode,
}: {
  bearing: number
  center?: [number, number]
  followPosition: boolean
  pitch: number
  terrainEnabled: boolean
  viewMode: RouteMapViewMode
}): CameraTarget => ({
  ...(center ? { center } : {}),
  bearing,
  followPosition,
  pitch,
  terrainEnabled,
  viewMode,
})

const applyTopDownCamera = (
  mapRef: RefObject<MapRef | null>,
  followPosition: boolean,
  riderPosition: RoutePosition | null
) => {
  mapRef.current?.easeTo({
    ...(followPosition && riderPosition
      ? {
          center: [riderPosition.lng, riderPosition.lat] as [number, number],
        }
      : {}),
    pitch: 0,
    bearing: 0,
    duration: CAMERA_DURATION_MS,
  })
}

const applyPerspectiveCamera = ({
  bearing,
  getPerspectiveTerrainElevation,
  mapRef,
  pitch,
  riderPosition,
  syncPerspectiveCameraElevation,
  zoom,
}: {
  bearing: number
  getPerspectiveTerrainElevation: (position: RoutePosition) => number | undefined
  mapRef: RefObject<MapRef | null>
  pitch: number
  riderPosition: RoutePosition
  syncPerspectiveCameraElevation: () => void
  zoom: number
}) => {
  const elevation = getPerspectiveTerrainElevation(riderPosition)

  mapRef.current?.flyTo({
    center: [riderPosition.lng, riderPosition.lat],
    ...(elevation !== undefined ? { elevation } : {}),
    offset: PERSPECTIVE_FOLLOW_OFFSET_PX,
    zoom,
    pitch,
    bearing,
    duration: CAMERA_DURATION_MS,
    curve: 1.2,
    maxDuration: CAMERA_DURATION_MS,
    freezeElevation: false,
  })
  syncPerspectiveCameraElevation()
}

export const useRouteCamera = ({
  followPosition,
  geojson,
  getPerspectiveTerrainElevation,
  mapRef,
  riderGradePercent,
  riderPosition,
  syncPerspectiveCameraElevation,
  terrainEnabled,
  viewMode,
}: UseRouteCameraArgs) => {
  const previousBearingRef = useRef(0)
  const previousViewModeRef = useRef<RouteMapViewMode>(viewMode)
  const lastCameraTargetRef = useRef<CameraTarget | null>(null)
  const routeBearingSegments = useMemo(
    () => buildRouteBearingSegments(geojson),
    [geojson]
  )

  useEffect(() => {
    if (!mapRef.current) return
    const previousViewMode = previousViewModeRef.current
    previousViewModeRef.current = viewMode

    if (viewMode === "top-down") {
      previousBearingRef.current = 0
      if (previousViewMode === "top-down" && !followPosition) {
        return
      }

      const target = buildTopDownCameraTarget({
        followPosition,
        riderPosition,
        terrainEnabled,
        viewMode,
      })
      if (!shouldUpdateCamera(lastCameraTargetRef.current, target)) return

      lastCameraTargetRef.current = target
      applyTopDownCamera(mapRef, followPosition, riderPosition)
      return
    }

    const bearing =
      riderPosition === null
        ? previousBearingRef.current
        : (computeRouteBearingNearPosition(
            routeBearingSegments,
            riderPosition
          ) ?? previousBearingRef.current)
    previousBearingRef.current = bearing

    if (!followPosition || !riderPosition) {
      const pitch = getPerspectivePitch(
        mapRef.current.getZoom(),
        riderGradePercent
      )
      const target = buildPerspectiveCameraTarget({
        bearing,
        followPosition,
        pitch,
        terrainEnabled,
        viewMode,
      })
      if (!shouldUpdateCamera(lastCameraTargetRef.current, target)) return

      lastCameraTargetRef.current = target
      mapRef.current.easeTo({
        pitch,
        bearing,
        duration: CAMERA_DURATION_MS,
      })
      return
    }

    const zoom = Math.max(mapRef.current.getZoom(), PERSPECTIVE_ZOOM_FLOOR)
    const pitch = getPerspectivePitch(zoom, riderGradePercent)
    const target = buildPerspectiveCameraTarget({
      bearing,
      center: [riderPosition.lng, riderPosition.lat],
      followPosition,
      pitch,
      terrainEnabled,
      viewMode,
    })
    if (!shouldUpdateCamera(lastCameraTargetRef.current, target)) return

    lastCameraTargetRef.current = target
    applyPerspectiveCamera({
      bearing,
      getPerspectiveTerrainElevation,
      mapRef,
      pitch,
      riderPosition,
      syncPerspectiveCameraElevation,
      zoom,
    })
  }, [
    followPosition,
    getPerspectiveTerrainElevation,
    mapRef,
    riderGradePercent,
    riderPosition,
    routeBearingSegments,
    syncPerspectiveCameraElevation,
    terrainEnabled,
    viewMode,
  ])
}
