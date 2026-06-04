import { FREE_RIDE_CAMERA } from "../../free-ride-config"
import { clamp, getLateralCurvature } from "../../track"

const YAW_DRIFT_SAMPLE_COUNT = 9
const YAW_DRIFT_START_OFFSET = -FREE_RIDE_CAMERA.yawDriftLookAheadMeters * 0.35
const YAW_DRIFT_END_OFFSET = FREE_RIDE_CAMERA.yawDriftLookAheadMeters
const YAW_DRIFT_SAMPLE_OFFSETS: Array<number> = []
const YAW_DRIFT_SAMPLE_WEIGHTS: Array<number> = []
let YAW_DRIFT_TOTAL_WEIGHT = 0

for (let i = 0; i < YAW_DRIFT_SAMPLE_COUNT; i += 1) {
  const t = i / (YAW_DRIFT_SAMPLE_COUNT - 1)
  const offset =
    YAW_DRIFT_START_OFFSET + (YAW_DRIFT_END_OFFSET - YAW_DRIFT_START_OFFSET) * t
  const weight = Math.sin(Math.PI * t)
  YAW_DRIFT_SAMPLE_OFFSETS.push(offset)
  YAW_DRIFT_SAMPLE_WEIGHTS.push(weight)
  YAW_DRIFT_TOTAL_WEIGHT += weight
}

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
  const shapedTurn = Math.sign(curvatureRatio) * Math.abs(curvatureRatio) ** 0.8
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
  let weightedCurvature = 0

  for (let i = 0; i < YAW_DRIFT_SAMPLE_COUNT; i += 1) {
    weightedCurvature +=
      getLateralCurvature(distance + YAW_DRIFT_SAMPLE_OFFSETS[i]) *
      YAW_DRIFT_SAMPLE_WEIGHTS[i]
  }

  return YAW_DRIFT_TOTAL_WEIGHT > 0
    ? weightedCurvature / YAW_DRIFT_TOTAL_WEIGHT
    : 0
}
