import { FREE_RIDE_CAMERA } from "../../free-ride-config"
import {
  clamp,
  createTrackSample,
  getLateralCurvature,
  sampleTrackInto,
} from "../../track"

export type GradeCameraBiasTarget = {
  eyeHeightMeters: number
  targetHeightMeters: number
}

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

const GRADE_BIAS_SAMPLE_COUNT = 9
const GRADE_BIAS_START_OFFSET = -FREE_RIDE_CAMERA.gradeHeightBiasTrailMeters
const GRADE_BIAS_END_OFFSET = FREE_RIDE_CAMERA.gradeHeightBiasLookAheadMeters
const GRADE_BIAS_CENTER_T = 0.6
const GRADE_BIAS_SAMPLE_OFFSETS: Array<number> = []
const GRADE_BIAS_SAMPLE_WEIGHTS: Array<number> = []
const gradeBiasSample = createTrackSample()
let GRADE_BIAS_TOTAL_WEIGHT = 0

for (let i = 0; i < GRADE_BIAS_SAMPLE_COUNT; i += 1) {
  const t = i / (GRADE_BIAS_SAMPLE_COUNT - 1)
  const offset =
    GRADE_BIAS_START_OFFSET +
    (GRADE_BIAS_END_OFFSET - GRADE_BIAS_START_OFFSET) * t
  const centeredT = 1 - Math.min(Math.abs(t - GRADE_BIAS_CENTER_T) / 0.6, 1)
  const weight = Math.sin(Math.PI * t) * (0.65 + centeredT * 0.35)
  GRADE_BIAS_SAMPLE_OFFSETS.push(offset)
  GRADE_BIAS_SAMPLE_WEIGHTS.push(weight)
  GRADE_BIAS_TOTAL_WEIGHT += weight
}

export function getGradeCameraBiasTarget(
  distance: number
): GradeCameraBiasTarget {
  const { climbSignal, descentSignal } = getGradeBiasSignals(distance)
  const climbRatio = clamp(
    (climbSignal * 100) / FREE_RIDE_CAMERA.gradeClimbFullGradePercent,
    0,
    1
  )
  const descentRatio = clamp(
    (-descentSignal * 100) / FREE_RIDE_CAMERA.gradeDescentFullGradePercent,
    0,
    1
  )
  const climbLift = climbRatio * FREE_RIDE_CAMERA.gradeClimbLiftMeters
  const descentLift = descentRatio * FREE_RIDE_CAMERA.gradeDescentLiftMeters
  const eyeHeightMeters = clamp(
    climbLift + descentLift,
    0,
    Math.max(
      FREE_RIDE_CAMERA.gradeClimbLiftMeters,
      FREE_RIDE_CAMERA.gradeDescentLiftMeters
    )
  )
  const targetHeightMeters = clamp(
    climbLift * FREE_RIDE_CAMERA.gradeClimbTargetBiasMultiplier +
      descentLift * FREE_RIDE_CAMERA.gradeDescentTargetBiasMultiplier,
    0,
    Math.max(
      FREE_RIDE_CAMERA.gradeClimbLiftMeters *
        FREE_RIDE_CAMERA.gradeClimbTargetBiasMultiplier,
      FREE_RIDE_CAMERA.gradeDescentLiftMeters *
        FREE_RIDE_CAMERA.gradeDescentTargetBiasMultiplier
    )
  )

  return { eyeHeightMeters, targetHeightMeters }
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

function getGradeBiasSignals(distance: number): {
  climbSignal: number
  descentSignal: number
} {
  let weightedClimb = 0
  let weightedDescent = 0

  for (let i = 0; i < GRADE_BIAS_SAMPLE_COUNT; i += 1) {
    const grade = sampleTrackInto(
      distance + GRADE_BIAS_SAMPLE_OFFSETS[i],
      gradeBiasSample
    ).grade
    const weight = GRADE_BIAS_SAMPLE_WEIGHTS[i]

    if (grade > 0) weightedClimb += grade * weight
    else if (grade < 0) weightedDescent += grade * weight
  }

  if (GRADE_BIAS_TOTAL_WEIGHT <= 0) {
    return { climbSignal: 0, descentSignal: 0 }
  }

  return {
    climbSignal: weightedClimb / GRADE_BIAS_TOTAL_WEIGHT,
    descentSignal: weightedDescent / GRADE_BIAS_TOTAL_WEIGHT,
  }
}
