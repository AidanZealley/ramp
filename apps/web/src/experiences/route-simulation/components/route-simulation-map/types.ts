import type { RouteMapViewMode } from "@/experiences/route-simulation/types"
import type { RoutePoint, RoutePosition } from "@/lib/routes/types"

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

export type RouteDistanceCursor = {
  segmentIndex: number
}

export type RiderRenderedPositionSnapshot = {
  distanceMeters: number
  position: RoutePosition | null
  snapped: boolean
  timestampMs: number
  segmentIndex: number | null
  bearing: number | null
}

export type RiderDistanceSample = {
  distanceMeters: number
  timestampMs: number
  speedMetersPerSecond: number
}

export type RouteDistanceInterpolationArgs = {
  routePoints: Array<RoutePoint>
  distanceMeters: number
  cursor: RouteDistanceCursor
}

export type RoutePositionAtDistanceResult = {
  position: RoutePosition | null
  segmentIndex: number | null
  bearing: number | null
}
