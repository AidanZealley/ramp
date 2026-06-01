import { v } from "convex/values"

export const MAX_ROUTE_SEGMENTS_PER_ROUTE = 100
export const MAX_ROUTE_SEGMENT_PREVIEW_SAMPLES = 80

export const routeSegmentPreviewSampleValidator = v.object({
  distanceMeters: v.number(),
  elevationMeters: v.number(),
})

export const routeSegmentInputValidator = v.object({
  type: v.literal("climb"),
  startDistanceMeters: v.number(),
  endDistanceMeters: v.number(),
  distanceMeters: v.number(),
  startElevationMeters: v.number(),
  endElevationMeters: v.number(),
  elevationGainMeters: v.number(),
  averageGradient: v.number(),
  previewSamples: v.array(routeSegmentPreviewSampleValidator),
})

export type GeneratedRouteSegmentInput = {
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

function assertFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`)
  }
}

export function validateGeneratedRouteSegments(
  segments: Array<GeneratedRouteSegmentInput>
) {
  if (segments.length > MAX_ROUTE_SEGMENTS_PER_ROUTE) {
    throw new Error(
      `segments must contain at most ${MAX_ROUTE_SEGMENTS_PER_ROUTE} items`
    )
  }

  for (const [segmentIndex, segment] of segments.entries()) {
    const numericFields = [
      "startDistanceMeters",
      "endDistanceMeters",
      "distanceMeters",
      "startElevationMeters",
      "endElevationMeters",
      "elevationGainMeters",
      "averageGradient",
    ] as const

    for (const field of numericFields) {
      assertFiniteNumber(segment[field], `segments[${segmentIndex}].${field}`)
    }

    if (segment.startDistanceMeters < 0 || segment.endDistanceMeters < 0) {
      throw new Error(`segments[${segmentIndex}] distances must be non-negative`)
    }
    if (segment.distanceMeters < 0 || segment.elevationGainMeters < 0) {
      throw new Error(`segments[${segmentIndex}] gain/span must be non-negative`)
    }
    if (segment.averageGradient < 0) {
      throw new Error(
        `segments[${segmentIndex}].averageGradient must be non-negative`
      )
    }
    if (segment.endDistanceMeters <= segment.startDistanceMeters) {
      throw new Error(
        `segments[${segmentIndex}].endDistanceMeters must be greater than startDistanceMeters`
      )
    }

    const span = segment.endDistanceMeters - segment.startDistanceMeters
    if (Math.abs(segment.distanceMeters - span) > 1) {
      throw new Error(
        `segments[${segmentIndex}].distanceMeters must match segment distance span`
      )
    }

    if (
      segment.previewSamples.length > MAX_ROUTE_SEGMENT_PREVIEW_SAMPLES
    ) {
      throw new Error(
        `segments[${segmentIndex}].previewSamples must contain at most ${MAX_ROUTE_SEGMENT_PREVIEW_SAMPLES} samples`
      )
    }

    let previousDistance = -Infinity
    for (const [sampleIndex, sample] of segment.previewSamples.entries()) {
      assertFiniteNumber(
        sample.distanceMeters,
        `segments[${segmentIndex}].previewSamples[${sampleIndex}].distanceMeters`
      )
      assertFiniteNumber(
        sample.elevationMeters,
        `segments[${segmentIndex}].previewSamples[${sampleIndex}].elevationMeters`
      )
      if (sample.distanceMeters < previousDistance) {
        throw new Error(
          `segments[${segmentIndex}].previewSamples must be ordered by distanceMeters`
        )
      }
      previousDistance = sample.distanceMeters
    }
  }

  return segments
}
