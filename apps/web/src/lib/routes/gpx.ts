import { parseGPX } from "@we-gold/gpxjs"
import {
  ELEVATION_SAMPLE_LIMIT,
  
  MAX_GPX_FILE_SIZE_BYTES,
  
  
  ROUTE_PREVIEW_POINT_LIMIT
  
  
  
} from "./types"
import type {ElevationSample, ParseRouteGpxResult, ParsedRouteGpx, RouteBounds, RoutePoint, RoutePreviewPoint} from "./types";
import type { FeatureCollection, LineString } from "geojson"

type GpxPoint = {
  latitude: number
  longitude: number
  elevation: number | null
}

function haversineMeters(a: GpxPoint, b: GpxPoint): number {
  const earthRadiusMeters = 6371000
  const toRadians = (value: number) => (value * Math.PI) / 180
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)
  const deltaLat = toRadians(b.latitude - a.latitude)
  const deltaLng = toRadians(b.longitude - a.longitude)
  const sinLat = Math.sin(deltaLat / 2)
  const sinLng = Math.sin(deltaLng / 2)
  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function downsampleEvenly<T>(items: Array<T>, limit: number): Array<T> {
  if (items.length <= limit) return items
  if (limit <= 0) return []
  if (limit === 1) return [items[0]]

  return Array.from({ length: limit }, (_, index) => {
    const itemIndex = Math.round((index / (limit - 1)) * (items.length - 1))
    return items[itemIndex]
  })
}

function getBounds(points: Array<RoutePoint>): RouteBounds | null {
  if (points.length === 0) return null

  return points.reduce<RouteBounds>(
    (bounds, point) => ({
      minLat: Math.min(bounds.minLat, point.lat),
      minLng: Math.min(bounds.minLng, point.lng),
      maxLat: Math.max(bounds.maxLat, point.lat),
      maxLng: Math.max(bounds.maxLng, point.lng),
    }),
    {
      minLat: points[0].lat,
      minLng: points[0].lng,
      maxLat: points[0].lat,
      maxLng: points[0].lng,
    }
  )
}

function normalizePreviewPoints(
  points: Array<RoutePoint>
): Array<RoutePreviewPoint> {
  const sampled = downsampleEvenly(points, ROUTE_PREVIEW_POINT_LIMIT)
  if (sampled.length === 0) return []

  const averageLatRadians =
    (sampled.reduce((total, point) => total + point.lat, 0) / sampled.length) *
    (Math.PI / 180)
  const lngScale = Math.max(Math.cos(averageLatRadians), 0.000001)
  const projected = sampled.map((point) => ({
    x: point.lng * lngScale,
    y: point.lat,
  }))
  const minX = Math.min(...projected.map((point) => point.x))
  const maxX = Math.max(...projected.map((point) => point.x))
  const minY = Math.min(...projected.map((point) => point.y))
  const maxY = Math.max(...projected.map((point) => point.y))
  const xRange = maxX - minX
  const yRange = maxY - minY
  const scale = Math.max(xRange, yRange) || 1
  const xOffset = (1 - xRange / scale) / 2
  const yOffset = (1 - yRange / scale) / 2

  return projected.map((point) => ({
    x: xOffset + (point.x - minX) / scale,
    y: 1 - (yOffset + (point.y - minY) / scale),
  }))
}

function buildElevationSamples(points: Array<RoutePoint>): Array<ElevationSample> {
  const samples = points
    .filter((point) => point.elevationMeters !== null)
    .map((point) => ({
      distanceMeters: point.distanceMeters,
      elevationMeters: point.elevationMeters as number,
    }))

  return downsampleEvenly(samples, ELEVATION_SAMPLE_LIMIT)
}

function getTitle(parsed: ReturnType<typeof parseGPX>[0], fallbackTitle: string) {
  return (
    parsed?.metadata?.name ||
    parsed?.tracks?.find((track) => track.name)?.name ||
    parsed?.routes?.find((route) => route.name)?.name ||
    fallbackTitle
  )
}

function isValidCoordinate(point: GpxPoint): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  )
}

function stripGpxExtension(fileName: string): string {
  return fileName.replace(/\.gpx$/i, "").trim() || "Imported route"
}

export function parseRouteGpxText(
  text: string,
  fileName = "Imported route.gpx"
): ParseRouteGpxResult {
  const xmlDocument = new DOMParser().parseFromString(text, "application/xml")
  if (xmlDocument.querySelector("parsererror")) {
    return { kind: "error", message: "Invalid GPX XML" }
  }

  const [parsed, error] = parseGPX(text)
  if (error || !parsed) {
    return { kind: "error", message: "Invalid GPX XML" }
  }

  const rawPoints: Array<GpxPoint> = [
    ...parsed.tracks.flatMap((track) => track.points),
    ...parsed.routes.flatMap((routeData) => routeData.points),
  ].filter(isValidCoordinate)

  if (rawPoints.length < 2) {
    return {
      kind: "error",
      message: "GPX must include at least two valid coordinates",
    }
  }

  let distanceMeters = 0
  let elevationGainMeters = 0
  let elevationLossMeters = 0
  let minElevationMeters: number | null = null
  let maxElevationMeters: number | null = null

  const points: Array<RoutePoint> = rawPoints.map((point, index) => {
    if (index > 0) {
      distanceMeters += haversineMeters(rawPoints[index - 1], point)
    }

    if (point.elevation !== null && Number.isFinite(point.elevation)) {
      minElevationMeters =
        minElevationMeters === null
          ? point.elevation
          : Math.min(minElevationMeters, point.elevation)
      maxElevationMeters =
        maxElevationMeters === null
          ? point.elevation
          : Math.max(maxElevationMeters, point.elevation)

      const previousElevation = rawPoints[index - 1]?.elevation
      if (
        index > 0 &&
        previousElevation !== null &&
        Number.isFinite(previousElevation)
      ) {
        const delta = point.elevation - previousElevation
        if (delta > 0) elevationGainMeters += delta
        if (delta < 0) elevationLossMeters += Math.abs(delta)
      }
    }

    return {
      lat: point.latitude,
      lng: point.longitude,
      elevationMeters:
        point.elevation !== null && Number.isFinite(point.elevation)
          ? point.elevation
          : null,
      distanceMeters,
    }
  })

  const bounds = getBounds(points)
  const geojson: FeatureCollection<LineString> = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: points.map((point) => [point.lng, point.lat]),
        },
      },
    ],
  }

  const route: ParsedRouteGpx = {
    title: getTitle(parsed, stripGpxExtension(fileName)),
    points,
    geojson,
    stats: {
      distanceMeters,
      elevationGainMeters,
      elevationLossMeters,
      minElevationMeters,
      maxElevationMeters,
      pointCount: points.length,
    },
    bounds,
    start: { lat: points[0].lat, lng: points[0].lng },
    finish: {
      lat: points[points.length - 1].lat,
      lng: points[points.length - 1].lng,
    },
    elevationSamples: buildElevationSamples(points),
    previewPoints: normalizePreviewPoints(points),
  }

  return { kind: "success", route }
}

export async function parseRouteGpxFile(
  file: File
): Promise<ParseRouteGpxResult> {
  if (file.size > MAX_GPX_FILE_SIZE_BYTES) {
    return { kind: "error", message: "GPX files must be 10 MB or smaller" }
  }

  if (!file.name.toLowerCase().endsWith(".gpx")) {
    return { kind: "error", message: "Choose a .gpx file" }
  }

  return parseRouteGpxText(await file.text(), file.name)
}
