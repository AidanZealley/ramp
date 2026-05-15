import type { FeatureCollection, LineString } from "geojson"

export const MAX_GPX_FILE_SIZE_BYTES = 10 * 1024 * 1024
export const ROUTE_PREVIEW_POINT_LIMIT = 80
export const ELEVATION_SAMPLE_LIMIT = 500

export type RoutePoint = {
  lat: number
  lng: number
  elevationMeters: number | null
  distanceMeters: number
}

export type RouteBounds = {
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
}

export type RoutePosition = {
  lat: number
  lng: number
}

export type RoutePreviewPoint = {
  x: number
  y: number
}

export type RouteStatsSnapshot = {
  distanceMeters: number
  elevationGainMeters: number
  elevationLossMeters: number
  minElevationMeters: number | null
  maxElevationMeters: number | null
  pointCount: number
}

export type ElevationSample = {
  distanceMeters: number
  elevationMeters: number
}

export type ParsedRouteGpx = {
  title: string
  points: Array<RoutePoint>
  geojson: FeatureCollection<LineString>
  stats: RouteStatsSnapshot
  bounds: RouteBounds | null
  start: RoutePosition | null
  finish: RoutePosition | null
  elevationSamples: Array<ElevationSample>
  previewPoints: Array<RoutePreviewPoint>
}

export type ParseRouteGpxResult =
  | { kind: "success"; route: ParsedRouteGpx }
  | { kind: "error"; message: string }
