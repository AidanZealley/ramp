import {
  
  downsampleByDistance,
  smoothElevationByDistance
} from "./utils"
import type {ElevationProfileSample} from "./utils";
import type { RoutePoint } from "@/lib/routes/types"
import type { GeneratedRouteSegment, RouteSegmentDetector } from "./types"

const MIN_CLIMB_DISTANCE_METERS = 500
const MIN_ELEVATION_GAIN_METERS = 30
const MIN_AVERAGE_GRADIENT = 0.03
const SMOOTHING_WINDOW_METERS = 100
const NON_CLIMBING_TOLERANCE_METERS = 200
const ELEVATION_LOSS_TOLERANCE_METERS = 10
const MAX_PREVIEW_SAMPLES = 80

function getValidElevationSamples(points: Array<RoutePoint>) {
  return points
    .filter(
      (point) =>
        point.elevationMeters !== null &&
        Number.isFinite(point.elevationMeters) &&
        Number.isFinite(point.distanceMeters)
    )
    .map((point) => ({
      distanceMeters: point.distanceMeters,
      elevationMeters: point.elevationMeters as number,
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
}

function createClimbSegment(
  profile: Array<ElevationProfileSample>,
  startIndex: number,
  endIndex: number
): GeneratedRouteSegment | null {
  const start = profile[startIndex]
  const end = profile[endIndex]
  const distanceMeters = end.distanceMeters - start.distanceMeters
  const elevationGainMeters = end.elevationMeters - start.elevationMeters

  if (distanceMeters < MIN_CLIMB_DISTANCE_METERS) return null
  if (elevationGainMeters < MIN_ELEVATION_GAIN_METERS) return null
  const averageGradient = elevationGainMeters / distanceMeters
  if (averageGradient < MIN_AVERAGE_GRADIENT) return null

  return {
    type: "climb",
    startDistanceMeters: start.distanceMeters,
    endDistanceMeters: end.distanceMeters,
    distanceMeters,
    startElevationMeters: start.elevationMeters,
    endElevationMeters: end.elevationMeters,
    elevationGainMeters,
    averageGradient,
    previewSamples: downsampleByDistance(
      profile.slice(startIndex, endIndex + 1),
      MAX_PREVIEW_SAMPLES
    ),
  }
}

export const climbSegmentDetector: RouteSegmentDetector = {
  type: "climb",
  detect(points) {
    const samples = getValidElevationSamples(points)
    if (samples.length < 2) return []

    const profile = smoothElevationByDistance(samples, SMOOTHING_WINDOW_METERS)
    const segments: Array<GeneratedRouteSegment> = []
    let startIndex: number | null = null
    let lowIndex = 0
    let highIndex = 0
    let nonClimbingStartDistance: number | null = null

    for (let index = 1; index < profile.length; index += 1) {
      const current = profile[index]
      const previous = profile[index - 1]
      const deltaElevation = current.elevationMeters - previous.elevationMeters

      if (startIndex === null) {
        if (current.elevationMeters <= profile[lowIndex].elevationMeters) {
          lowIndex = index
        }
        if (deltaElevation > 0) {
          startIndex = lowIndex
          highIndex = index
          nonClimbingStartDistance = null
        }
        continue
      }

      if (current.elevationMeters > profile[highIndex].elevationMeters) {
        highIndex = index
        nonClimbingStartDistance = null
        continue
      }

      if (deltaElevation <= 0 && nonClimbingStartDistance === null) {
        nonClimbingStartDistance = previous.distanceMeters
      }

      const nonClimbingDistance =
        nonClimbingStartDistance === null
          ? 0
          : current.distanceMeters - nonClimbingStartDistance
      const lossFromHigh =
        profile[highIndex].elevationMeters - current.elevationMeters

      if (
        nonClimbingDistance >= NON_CLIMBING_TOLERANCE_METERS ||
        lossFromHigh >= ELEVATION_LOSS_TOLERANCE_METERS
      ) {
        const segment = createClimbSegment(profile, startIndex, highIndex)
        if (segment) segments.push(segment)
        startIndex = null
        lowIndex = index
        highIndex = index
        nonClimbingStartDistance = null
      }
    }

    if (startIndex !== null) {
      const segment = createClimbSegment(profile, startIndex, highIndex)
      if (segment) segments.push(segment)
    }

    return segments.sort(
      (a, b) => a.startDistanceMeters - b.startDistanceMeters
    )
  },
}
