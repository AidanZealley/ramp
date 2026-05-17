import type { RouteMapViewMode } from "@/experiences/route-simulation/types"
import type { RoutePosition } from "@/lib/routes/types"

export type MutableMapElevation = {
  _elevationFreeze?: boolean
  transform?: {
    setElevation?: (elevation: number) => void
  }
  triggerRepaint?: () => void
}

export type RouteBearingSegment = {
  midpoint: RoutePosition
  bearing: number
}

export type CameraTarget = {
  bearing: number
  center?: [number, number]
  followPosition: boolean
  pitch: number
  terrainEnabled: boolean
  viewMode: RouteMapViewMode
}

export type RiderDistanceAnimationState = {
  animationFrame: number | null
  lastFrameTimestamp: number | null
  lastTargetDistanceMeters: number | null
  lastTargetTimestamp: number | null
  renderedDistanceMeters: number | null
  speedMetersPerSecond: number
  targetDistanceMeters: number | null
}
