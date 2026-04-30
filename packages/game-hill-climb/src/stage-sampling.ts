import { getStageDistanceMeters } from "./stage-data"
import type { HillClimbStage, HillClimbStageSample } from "./types"

export function sampleStageAtDistance(
  stage: HillClimbStage,
  distanceMeters: number
): HillClimbStageSample {
  const totalDistanceMeters = getStageDistanceMeters(stage)
  const clampedDistance = clamp(distanceMeters, 0, totalDistanceMeters)
  const stageComplete = clampedDistance >= totalDistanceMeters
  let traversedMeters = 0

  for (let index = 0; index < stage.segments.length; index += 1) {
    const segment = stage.segments[index]
    const segmentEnd = traversedMeters + segment.lengthMeters

    if (clampedDistance < segmentEnd || index === stage.segments.length - 1) {
      return {
        currentSegment: segment,
        segmentIndex: index,
        distanceMeters: clampedDistance,
        remainingMeters: Math.max(0, totalDistanceMeters - clampedDistance),
        normalizedProgress:
          totalDistanceMeters === 0 ? 1 : clampedDistance / totalDistanceMeters,
        gradePercent: segment.gradePercent,
        stageComplete,
        totalDistanceMeters,
      }
    }

    traversedMeters = segmentEnd
  }

  const fallbackSegment = stage.segments.at(-1)
  if (!fallbackSegment) {
    throw new Error("Hill climb stage requires at least one segment")
  }

  return {
    currentSegment: fallbackSegment,
    segmentIndex: Math.max(stage.segments.length - 1, 0),
    distanceMeters: clampedDistance,
    remainingMeters: 0,
    normalizedProgress: 1,
    gradePercent: fallbackSegment.gradePercent,
    stageComplete: true,
    totalDistanceMeters,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
