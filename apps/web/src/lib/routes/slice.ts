import { buildParsedRouteFromPoints } from "./gpx"
import { interpolateRoutePointByDistance } from "./simulation"
import type { ParsedRouteGpx, RoutePoint } from "./types"

export type RouteSliceMetadata = {
  title: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function rebasePoint(point: RoutePoint, startDistanceMeters: number): RoutePoint {
  return {
    ...point,
    distanceMeters: point.distanceMeters - startDistanceMeters,
  }
}

function sameDistance(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.001
}

export function sliceParsedRouteGpx(
  route: ParsedRouteGpx,
  range: {
    startDistanceMeters: number
    endDistanceMeters: number
  },
  metadata: RouteSliceMetadata
): ParsedRouteGpx {
  const routeDistanceMeters = route.stats.distanceMeters
  if (
    !Number.isFinite(range.startDistanceMeters) ||
    !Number.isFinite(range.endDistanceMeters) ||
    !Number.isFinite(routeDistanceMeters)
  ) {
    throw new Error("Route segment distances are invalid.")
  }

  const clampedStart = clamp(range.startDistanceMeters, 0, routeDistanceMeters)
  const clampedEnd = clamp(range.endDistanceMeters, 0, routeDistanceMeters)
  const startDistanceMeters = Math.min(clampedStart, clampedEnd)
  const endDistanceMeters = Math.max(clampedStart, clampedEnd)

  if (
    sameDistance(startDistanceMeters, 0) &&
    sameDistance(endDistanceMeters, routeDistanceMeters)
  ) {
    return route
  }

  const startPoint = interpolateRoutePointByDistance(
    route.points,
    startDistanceMeters
  )
  const endPoint = interpolateRoutePointByDistance(route.points, endDistanceMeters)

  if (!startPoint || !endPoint) {
    throw new Error("Route segment could not be sliced.")
  }

  const middlePoints = route.points.filter(
    (point) =>
      point.distanceMeters > startDistanceMeters &&
      point.distanceMeters < endDistanceMeters
  )
  const slicedPoints = [startPoint, ...middlePoints, endPoint].map((point) =>
    rebasePoint(point, startDistanceMeters)
  )

  if (
    slicedPoints.length < 2 ||
    sameDistance(
      slicedPoints[0].distanceMeters,
      slicedPoints[slicedPoints.length - 1].distanceMeters
    )
  ) {
    throw new Error("Route segment is too short to ride.")
  }

  return buildParsedRouteFromPoints(metadata.title, slicedPoints)
}
