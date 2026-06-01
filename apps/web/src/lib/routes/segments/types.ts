import type { RoutePoint } from "@/lib/routes/types"

export type RouteSegmentType = "climb"

export type GeneratedRouteSegment = {
  type: "climb"
  startDistanceMeters: number
  endDistanceMeters: number
  distanceMeters: number
  startElevationMeters: number
  endElevationMeters: number
  elevationGainMeters: number
  averageGradient: number
  previewSamples: Array<{
    distanceMeters: number
    elevationMeters: number
  }>
}

export type RouteSegmentDetector = {
  type: RouteSegmentType
  detect: (points: Array<RoutePoint>) => Array<GeneratedRouteSegment>
}
