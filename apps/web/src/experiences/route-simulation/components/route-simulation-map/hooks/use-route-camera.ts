import { useEffect, useMemo, useRef } from "react"
import type { RefObject } from "react"
import type { MapRef } from "@vis.gl/react-maplibre"
import type { FeatureCollection, LineString } from "geojson"
import type {
  RouteMapViewMode,
} from "@/experiences/route-simulation/types"
import type { RoutePosition } from "@/lib/routes/types"
import {
  CAMERA_FOLLOW_EASE_DURATION_MS,
  CAMERA_DURATION_MS,
  CAMERA_MODE_TRANSITION_DURATION_MS,
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
  rawRiderPosition: RoutePosition | null
  renderedRiderPosition: RoutePosition | null
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
  "followPosition" | "terrainEnabled" | "viewMode"
> & {
  riderPosition: RoutePosition | null
}): CameraTarget => ({
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
  riderPosition: RoutePosition | null,
  duration: number,
  useFlyTo: boolean
) => {
  const options = {
    ...(followPosition && riderPosition
      ? {
          center: [riderPosition.lng, riderPosition.lat] as [number, number],
        }
      : {}),
    pitch: 0,
    bearing: 0,
    duration,
  }

  if (useFlyTo) {
    mapRef.current?.flyTo(options)
  } else {
    mapRef.current?.easeTo(options)
  }
}

const applyPerspectiveCamera = ({
  bearing,
  getPerspectiveTerrainElevation,
  mapRef,
  pitch,
  riderPosition,
  syncPerspectiveCameraElevation,
  zoom,
  duration,
  useFlyTo,
}: {
  bearing: number
  getPerspectiveTerrainElevation: (position: RoutePosition) => number | undefined
  mapRef: RefObject<MapRef | null>
  pitch: number
  riderPosition: RoutePosition
  syncPerspectiveCameraElevation: () => void
  zoom: number
  duration: number
  useFlyTo: boolean
}) => {
  const elevation = getPerspectiveTerrainElevation(riderPosition)

  const options = {
    center: [riderPosition.lng, riderPosition.lat] as [number, number],
    ...(elevation !== undefined ? { elevation } : {}),
    offset: PERSPECTIVE_FOLLOW_OFFSET_PX,
    zoom,
    pitch,
    bearing,
    duration,
    ...(useFlyTo
      ? {
          curve: 1.2,
          maxDuration: duration,
        }
      : {}),
    freezeElevation: false,
  }

  if (useFlyTo) {
    mapRef.current?.flyTo(options)
  } else {
    mapRef.current?.easeTo(options)
  }
  syncPerspectiveCameraElevation()
}

export const useRouteCamera = ({
  followPosition,
  geojson,
  getPerspectiveTerrainElevation,
  mapRef,
  riderGradePercent,
  rawRiderPosition,
  renderedRiderPosition,
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
    const isModeTransition = previousViewMode !== viewMode
    previousViewModeRef.current = viewMode
    const riderPosition = renderedRiderPosition ?? rawRiderPosition

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
      applyTopDownCamera(
        mapRef,
        followPosition,
        riderPosition,
        isModeTransition
          ? CAMERA_MODE_TRANSITION_DURATION_MS
          : CAMERA_DURATION_MS,
        isModeTransition
      )
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
        duration: isModeTransition
          ? CAMERA_MODE_TRANSITION_DURATION_MS
          : CAMERA_DURATION_MS,
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
      duration: isModeTransition
        ? CAMERA_MODE_TRANSITION_DURATION_MS
        : CAMERA_FOLLOW_EASE_DURATION_MS,
      useFlyTo: isModeTransition,
    })
  }, [
    followPosition,
    getPerspectiveTerrainElevation,
    mapRef,
    rawRiderPosition,
    renderedRiderPosition,
    riderGradePercent,
    routeBearingSegments,
    syncPerspectiveCameraElevation,
    terrainEnabled,
    viewMode,
  ])
}
