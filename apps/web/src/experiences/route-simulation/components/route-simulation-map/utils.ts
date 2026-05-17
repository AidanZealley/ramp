import type { FeatureCollection, LineString } from "geojson"
import type { RoutePoint, RoutePosition } from "@/lib/routes/types"
import { interpolateRoutePointByDistance } from "@/lib/routes/simulation"
import {
  CAMERA_BEARING_THRESHOLD_DEGREES,
  CAMERA_MOVE_THRESHOLD_METERS,
  CAMERA_PITCH_THRESHOLD_DEGREES,
  PERSPECTIVE_GRADE_PITCH_MULTIPLIER,
  PERSPECTIVE_GRADE_PITCH_RANGE,
  PERSPECTIVE_MAX_PITCH,
  PERSPECTIVE_MAX_PITCH_ZOOM,
  PERSPECTIVE_MIN_PITCH,
  PERSPECTIVE_MIN_PITCH_ZOOM,
} from "./constants"
import type { CameraTarget, RouteBearingSegment } from "./types"

const toRadians = (degrees: number) => (degrees * Math.PI) / 180
const toDegrees = (radians: number) => (radians * 180) / Math.PI

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const getPerspectivePitchForZoom = (zoom: number) => {
  const progress = clamp(
    (zoom - PERSPECTIVE_MIN_PITCH_ZOOM) /
      (PERSPECTIVE_MAX_PITCH_ZOOM - PERSPECTIVE_MIN_PITCH_ZOOM),
    0,
    1
  )

  return (
    PERSPECTIVE_MIN_PITCH +
    (PERSPECTIVE_MAX_PITCH - PERSPECTIVE_MIN_PITCH) * progress
  )
}

export const getPerspectivePitch = (zoom: number, gradePercent = 0) => {
  const gradePitchOffset = clamp(
    gradePercent * PERSPECTIVE_GRADE_PITCH_MULTIPLIER,
    -PERSPECTIVE_GRADE_PITCH_RANGE,
    PERSPECTIVE_GRADE_PITCH_RANGE
  )

  return clamp(
    getPerspectivePitchForZoom(zoom) + gradePitchOffset,
    PERSPECTIVE_MIN_PITCH,
    PERSPECTIVE_MAX_PITCH
  )
}

export const getBearing = (from: RoutePosition, to: RoutePosition) => {
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)
  const deltaLng = toRadians(to.lng - from.lng)
  const y = Math.sin(deltaLng) * Math.cos(toLat)
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng)

  return (toDegrees(Math.atan2(y, x)) + 360) % 360
}

export const distanceSquared = (a: RoutePosition, b: RoutePosition) => {
  const latDelta = a.lat - b.lat
  const lngDelta = a.lng - b.lng
  return latDelta * latDelta + lngDelta * lngDelta
}

export const distanceMeters = (a: RoutePosition, b: RoutePosition) => {
  const earthRadiusMeters = 6371000
  const latDelta = toRadians(b.lat - a.lat)
  const lngDelta = toRadians(b.lng - a.lng)
  const fromLat = toRadians(a.lat)
  const toLat = toRadians(b.lat)
  const sinLatDelta = Math.sin(latDelta / 2)
  const sinLngDelta = Math.sin(lngDelta / 2)
  const haversine =
    sinLatDelta * sinLatDelta +
    Math.cos(fromLat) * Math.cos(toLat) * sinLngDelta * sinLngDelta

  return (
    earthRadiusMeters *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  )
}

export const bearingDeltaDegrees = (a: number, b: number) => {
  const delta = Math.abs(a - b) % 360
  return delta > 180 ? 360 - delta : delta
}

export const clampDistanceToRoute = (
  routePoints: Array<RoutePoint>,
  targetDistanceMeters: number
) => {
  const start = routePoints[0]?.distanceMeters ?? 0
  const end = routePoints.at(-1)?.distanceMeters ?? start
  return clamp(targetDistanceMeters, start, end)
}

export const getRoutePositionAtDistance = (
  routePoints: Array<RoutePoint>,
  targetDistanceMeters: number
): RoutePosition | null => {
  return interpolateRoutePointByDistance(routePoints, targetDistanceMeters)
}

export const buildRouteBearingSegments = (
  geojson: FeatureCollection<LineString>
): Array<RouteBearingSegment> => {
  const segments: Array<RouteBearingSegment> = []

  for (const feature of geojson.features) {
    const coordinates = feature.geometry.coordinates
    for (let index = 0; index < coordinates.length - 1; index += 1) {
      const [fromLng, fromLat] = coordinates[index] ?? []
      const [toLng, toLat] = coordinates[index + 1] ?? []
      const from = { lat: fromLat, lng: fromLng }
      const to = { lat: toLat, lng: toLng }
      segments.push({
        midpoint: {
          lat: (from.lat + to.lat) / 2,
          lng: (from.lng + to.lng) / 2,
        },
        bearing: getBearing(from, to),
      })
    }
  }

  return segments
}

export const computeRouteBearingNearPosition = (
  routeBearingSegments: Array<RouteBearingSegment>,
  position: RoutePosition
) => {
  let best: { distance: number; bearing: number } | null = null

  for (const segment of routeBearingSegments) {
    const distance = distanceSquared(position, segment.midpoint)
    if (!best || distance < best.distance) {
      best = { distance, bearing: segment.bearing }
    }
  }

  return best?.bearing ?? null
}

export const shouldUpdateCamera = (
  previousTarget: CameraTarget | null,
  nextTarget: CameraTarget
) => {
  if (!previousTarget) return true
  if (previousTarget.viewMode !== nextTarget.viewMode) return true
  if (previousTarget.followPosition !== nextTarget.followPosition) return true
  if (previousTarget.terrainEnabled !== nextTarget.terrainEnabled) return true
  if (
    bearingDeltaDegrees(previousTarget.bearing, nextTarget.bearing) >=
    CAMERA_BEARING_THRESHOLD_DEGREES
  ) {
    return true
  }
  if (
    Math.abs(previousTarget.pitch - nextTarget.pitch) >=
    CAMERA_PITCH_THRESHOLD_DEGREES
  ) {
    return true
  }
  if (previousTarget.center && nextTarget.center) {
    return (
      distanceMeters(
        { lng: previousTarget.center[0], lat: previousTarget.center[1] },
        { lng: nextTarget.center[0], lat: nextTarget.center[1] }
      ) >= CAMERA_MOVE_THRESHOLD_METERS
    )
  }

  return previousTarget.center !== nextTarget.center
}
