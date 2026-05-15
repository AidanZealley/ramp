import type { RoutePoint, RoutePosition } from "./types"

const MIN_GRADE_PERCENT = -25
const MAX_GRADE_PERCENT = 25
const EARTH_RADIUS_METERS = 6371000

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

export function routeDistanceBetweenMeters(
  a: RoutePosition,
  b: RoutePosition
): number {
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const deltaLat = toRadians(b.lat - a.lat)
  const deltaLng = toRadians(b.lng - a.lng)
  const sinLat = Math.sin(deltaLat / 2)
  const sinLng = Math.sin(deltaLng / 2)
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function findSegmentIndex(points: Array<RoutePoint>, distanceMeters: number) {
  if (points.length < 2) return -1
  const clampedDistance = clamp(
    distanceMeters,
    points[0].distanceMeters,
    points[points.length - 1].distanceMeters
  )

  for (let index = 0; index < points.length - 1; index += 1) {
    if (
      points[index].distanceMeters <= clampedDistance &&
      points[index + 1].distanceMeters >= clampedDistance
    ) {
      return index
    }
  }

  return points.length - 2
}

export function interpolateRoutePointByDistance(
  points: Array<RoutePoint>,
  distanceMeters: number
): RoutePoint | null {
  if (points.length === 0) return null
  if (points.length === 1) return points[0]

  const index = findSegmentIndex(points, distanceMeters)
  if (index < 0) return points[0]

  const start = points[index]
  const end = points[index + 1]
  const segmentDistance = end.distanceMeters - start.distanceMeters
  if (segmentDistance <= 0) {
    return { ...start, distanceMeters: clamp(distanceMeters, 0, Infinity) }
  }

  const progress = clamp(
    (distanceMeters - start.distanceMeters) / segmentDistance,
    0,
    1
  )
  const startElevation = start.elevationMeters
  const endElevation = end.elevationMeters

  return {
    lat: start.lat + (end.lat - start.lat) * progress,
    lng: start.lng + (end.lng - start.lng) * progress,
    elevationMeters:
      startElevation === null || endElevation === null
        ? null
        : startElevation + (endElevation - startElevation) * progress,
    distanceMeters: start.distanceMeters + segmentDistance * progress,
  }
}

function hasElevationData(points: Array<RoutePoint>): boolean {
  return points.some((point) => point.elevationMeters !== null)
}

function elevationAtDistance(
  points: Array<RoutePoint>,
  distanceMeters: number
): number | null {
  return (
    interpolateRoutePointByDistance(points, distanceMeters)?.elevationMeters ??
    null
  )
}

export function computeRouteGradePercent(
  points: Array<RoutePoint>,
  distanceMeters: number,
  smoothingMeters: number
): number {
  if (points.length < 2 || !hasElevationData(points)) return 0

  if (smoothingMeters <= 0) {
    const index = findSegmentIndex(points, distanceMeters)
    if (index < 0) return 0
    const start = points[index]
    const end = points[index + 1]
    if (start.elevationMeters === null || end.elevationMeters === null) return 0
    const deltaDistance = end.distanceMeters - start.distanceMeters
    if (deltaDistance <= 0 || !Number.isFinite(deltaDistance)) return 0
    return clamp(
      ((end.elevationMeters - start.elevationMeters) / deltaDistance) * 100,
      MIN_GRADE_PERCENT,
      MAX_GRADE_PERCENT
    )
  }

  const routeStart = points[0].distanceMeters
  const routeEnd = points[points.length - 1].distanceMeters
  const startDistance = clamp(
    distanceMeters - smoothingMeters / 2,
    routeStart,
    routeEnd
  )
  const endDistance = clamp(
    distanceMeters + smoothingMeters / 2,
    routeStart,
    routeEnd
  )
  const deltaDistance = endDistance - startDistance
  if (deltaDistance <= 0 || !Number.isFinite(deltaDistance)) return 0

  const startElevation = elevationAtDistance(points, startDistance)
  const endElevation = elevationAtDistance(points, endDistance)
  if (startElevation === null || endElevation === null) return 0

  return clamp(
    ((endElevation - startElevation) / deltaDistance) * 100,
    MIN_GRADE_PERCENT,
    MAX_GRADE_PERCENT
  )
}

function projectPointToSegmentDistance(
  target: RoutePosition,
  start: RoutePoint,
  end: RoutePoint
): { distanceToRouteMeters: number; routeDistanceMeters: number } {
  const originLat = toRadians(target.lat)
  const metersPerDegreeLat = 111320
  const metersPerDegreeLng = Math.cos(originLat) * 111320
  const ax = (start.lng - target.lng) * metersPerDegreeLng
  const ay = (start.lat - target.lat) * metersPerDegreeLat
  const bx = (end.lng - target.lng) * metersPerDegreeLng
  const by = (end.lat - target.lat) * metersPerDegreeLat
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  const t =
    lengthSquared <= 0 ? 0 : clamp((-ax * dx - ay * dy) / lengthSquared, 0, 1)
  const px = ax + dx * t
  const py = ay + dy * t

  return {
    distanceToRouteMeters: Math.sqrt(px * px + py * py),
    routeDistanceMeters:
      start.distanceMeters + (end.distanceMeters - start.distanceMeters) * t,
  }
}

export function findNearestRouteDistanceMeters(
  points: Array<RoutePoint>,
  position: RoutePosition
): number {
  if (points.length === 0) return 0
  if (points.length === 1) return points[0].distanceMeters

  let nearest = {
    distanceToRouteMeters: Infinity,
    routeDistanceMeters: points[0].distanceMeters,
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const candidate = projectPointToSegmentDistance(
      position,
      points[index],
      points[index + 1]
    )
    if (candidate.distanceToRouteMeters < nearest.distanceToRouteMeters) {
      nearest = candidate
    }
  }

  return nearest.routeDistanceMeters
}
