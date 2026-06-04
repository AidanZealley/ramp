import { FREE_RIDE_CAMERA } from "../../free-ride-config"
import { clamp, getLateralCurvature } from "../../track"

export function getGradeHeightBiasTarget(grade: number): number {
  const gradeRatio = clamp(
    (grade * 100) / FREE_RIDE_CAMERA.gradeHeightBiasFullGradePercent,
    -1,
    1
  )

  if (gradeRatio === 0) return 0

  return -gradeRatio * FREE_RIDE_CAMERA.gradeHeightBiasMeters
}

export function getYawDriftTarget(input: {
  distance: number
  speed: number
  maxSpeed: number
}): number {
  const curvature = getYawDriftCurvatureSignal(input.distance)
  const curvatureRatio = clamp(
    curvature / FREE_RIDE_CAMERA.yawDriftFullCurvature,
    -1,
    1
  )
  const shapedTurn =
    Math.sign(curvatureRatio) * Math.abs(curvatureRatio) ** 0.8
  const speedRatio =
    input.maxSpeed > 0 ? clamp(input.speed / input.maxSpeed, 0, 1) : 0
  const speedT = clamp(
    (speedRatio - FREE_RIDE_CAMERA.yawDriftSpeedMinRatio) /
      (FREE_RIDE_CAMERA.yawDriftSpeedFullRatio -
        FREE_RIDE_CAMERA.yawDriftSpeedMinRatio),
    0,
    1
  )

  if (speedT === 0 || shapedTurn === 0) return 0

  return shapedTurn * speedT * FREE_RIDE_CAMERA.yawDriftStrengthMeters
}

function getYawDriftCurvatureSignal(distance: number): number {
  const lookAhead = FREE_RIDE_CAMERA.yawDriftLookAheadMeters
  const startOffset = -lookAhead * 0.35
  const endOffset = lookAhead
  const sampleCount = 9
  let weightedCurvature = 0
  let totalWeight = 0

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / (sampleCount - 1)
    const offset = startOffset + (endOffset - startOffset) * t
    const weight = Math.sin(Math.PI * t)

    weightedCurvature += getLateralCurvature(distance + offset) * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? weightedCurvature / totalWeight : 0
}
