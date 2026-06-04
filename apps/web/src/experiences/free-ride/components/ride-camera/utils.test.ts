import { describe, expect, it } from "vitest"
import { FREE_RIDE_CAMERA, FREE_RIDE_MOTION } from "../../free-ride-config"
import {
  createTrackSample,
  getLateralCurvature,
  sampleTrackInto,
} from "../../track"
import { getGradeCameraBiasTarget, getYawDriftTarget } from "./utils"

describe("getGradeCameraBiasTarget", () => {
  it("stays near zero on flat-ish sections", () => {
    let checked = 0

    for (let distance = 0; distance <= 20000; distance += 1) {
      if (!gradeBiasWindowIsFlat(distance)) continue

      const bias = getGradeCameraBiasTarget(distance)
      expect(Math.abs(bias.eyeHeightMeters)).toBeLessThan(0.12)
      expect(Math.abs(bias.targetHeightMeters)).toBeLessThan(0.08)
      checked += 1
      if (checked >= 12) break
    }

    expect(checked).toBeGreaterThanOrEqual(12)
  })

  it("lifts the camera on climbs", () => {
    const distance = findGradeDistance(0.08, 1)
    const bias = getGradeCameraBiasTarget(distance)

    expect(bias.eyeHeightMeters).toBeGreaterThan(0)
    expect(bias.targetHeightMeters).toBeGreaterThan(0)
  })

  it("makes descents more dramatic than climbs", () => {
    const climbDistance = findGradeDistance(0.08, 1)
    const descentDistance = findGradeDistance(0.08, -1)
    const climbBias = getGradeCameraBiasTarget(climbDistance)
    const descentBias = getGradeCameraBiasTarget(descentDistance)

    expect(descentBias.eyeHeightMeters).toBeGreaterThan(
      climbBias.eyeHeightMeters
    )
    expect(descentBias.targetHeightMeters).toBeGreaterThan(
      climbBias.targetHeightMeters
    )
  })

  it("lifts before a climb reaches the rider", () => {
    const distance = findPreClimbDistance()
    const currentGrade = sampleGrade(distance)
    const futureGrade = sampleGrade(
      distance + FREE_RIDE_CAMERA.gradeHeightBiasLookAheadMeters
    )
    const bias = getGradeCameraBiasTarget(distance)

    expect(Math.abs(currentGrade)).toBeLessThan(0.025)
    expect(futureGrade).toBeGreaterThan(0.06)
    expect(bias.eyeHeightMeters).toBeGreaterThan(0)
  })

  it("stays finite and bounded across a long sweep", () => {
    const maxEyeLift = Math.max(
      FREE_RIDE_CAMERA.gradeClimbLiftMeters,
      FREE_RIDE_CAMERA.gradeDescentLiftMeters
    )
    const maxTargetLift = Math.max(
      FREE_RIDE_CAMERA.gradeClimbLiftMeters *
        FREE_RIDE_CAMERA.gradeClimbTargetBiasMultiplier,
      FREE_RIDE_CAMERA.gradeDescentLiftMeters *
        FREE_RIDE_CAMERA.gradeDescentTargetBiasMultiplier
    )

    for (let distance = 0; distance <= 20000; distance += 17) {
      const bias = getGradeCameraBiasTarget(distance)

      expect(Number.isFinite(bias.eyeHeightMeters)).toBe(true)
      expect(Number.isFinite(bias.targetHeightMeters)).toBe(true)
      expect(bias.eyeHeightMeters).toBeGreaterThanOrEqual(0)
      expect(bias.eyeHeightMeters).toBeLessThanOrEqual(maxEyeLift + 1e-9)
      expect(bias.targetHeightMeters).toBeGreaterThanOrEqual(0)
      expect(bias.targetHeightMeters).toBeLessThanOrEqual(maxTargetLift + 1e-9)
    }
  })
})

describe("getYawDriftTarget", () => {
  const maxSpeed = FREE_RIDE_MOTION.maxSpeedMps
  const cruiseSpeed = FREE_RIDE_MOTION.cruiseSpeedMps

  it("returns zero with no speed", () => {
    expect(getYawDriftTarget({ distance: 1000, speed: 0, maxSpeed })).toBe(0)
  })

  it("returns finite values across a long sweep", () => {
    for (let distance = 0; distance <= 20000; distance += 31) {
      for (const speed of [0, cruiseSpeed, maxSpeed]) {
        expect(
          Number.isFinite(getYawDriftTarget({ distance, speed, maxSpeed }))
        ).toBe(true)
      }
    }
  })

  it("stays bounded by the configured strength", () => {
    for (let distance = 0; distance <= 20000; distance += 17) {
      const value = getYawDriftTarget({ distance, speed: maxSpeed, maxSpeed })

      expect(Math.abs(value)).toBeLessThanOrEqual(
        FREE_RIDE_CAMERA.yawDriftStrengthMeters + 1e-9
      )
    }
  })

  it("is near zero on near-straights", () => {
    let checked = 0

    for (let distance = 0; distance <= 20000; distance += 1) {
      const drift = getYawDriftTarget({ distance, speed: maxSpeed, maxSpeed })
      if (Math.abs(drift) >= 0.08) continue

      expect(Math.abs(drift)).toBeLessThan(0.08)
      checked += 1
      if (checked >= 25) break
    }

    expect(checked).toBeGreaterThanOrEqual(25)
  })

  it("gates by speed", () => {
    const distance = findTurningDistance()
    const lowSpeed = maxSpeed * FREE_RIDE_CAMERA.yawDriftSpeedMinRatio * 0.5
    const midSpeed =
      maxSpeed *
      ((FREE_RIDE_CAMERA.yawDriftSpeedMinRatio +
        FREE_RIDE_CAMERA.yawDriftSpeedFullRatio) /
        2)

    const lowDrift = getYawDriftTarget({
      distance,
      speed: lowSpeed,
      maxSpeed,
    })
    const midDrift = getYawDriftTarget({
      distance,
      speed: midSpeed,
      maxSpeed,
    })
    const fullDrift = getYawDriftTarget({
      distance,
      speed: maxSpeed,
      maxSpeed,
    })

    expect(lowDrift).toBe(0)
    expect(Math.abs(fullDrift)).toBeGreaterThan(Math.abs(midDrift))
  })

  it("follows the sign of upcoming curvature", () => {
    let checked = 0

    for (let distance = 0; distance <= 20000; distance += 19) {
      const curvature = getLateralCurvature(
        distance + FREE_RIDE_CAMERA.yawDriftLookAheadMeters
      )
      if (
        Math.abs(curvature) < 0.0005 ||
        !yawDriftWindowMatchesSign(distance)
      ) {
        continue
      }

      const drift = getYawDriftTarget({ distance, speed: maxSpeed, maxSpeed })
      expect(Math.sign(drift)).toBe(Math.sign(curvature))
      checked += 1
    }

    expect(checked).toBeGreaterThan(50)
  })
})

function findTurningDistance(): number {
  for (let distance = 0; distance <= 20000; distance += 1) {
    const curvature = getLateralCurvature(
      distance + FREE_RIDE_CAMERA.yawDriftLookAheadMeters
    )
    if (Math.abs(curvature) > 0.001) return distance
  }

  throw new Error("Expected to find a meaningful turning section")
}

function yawDriftWindowMatchesSign(distance: number): boolean {
  const curvatures = getYawDriftWindowCurvatures(distance)
  const signs = curvatures
    .filter((curvature) => Math.abs(curvature) >= 0.0005)
    .map(Math.sign)

  return signs.length > 0 && signs.every((sign) => sign === signs[0])
}

function getYawDriftWindowCurvatures(distance: number): Array<number> {
  const lookAhead = FREE_RIDE_CAMERA.yawDriftLookAheadMeters
  return [-lookAhead * 0.35, lookAhead * 0.325, lookAhead].map((offset) =>
    getLateralCurvature(distance + offset)
  )
}

function findGradeDistance(threshold: number, sign: 1 | -1): number {
  for (let distance = 0; distance <= 20000; distance += 1) {
    const grade = sampleGrade(distance)
    if (Math.sign(grade) === sign && Math.abs(grade) >= threshold) {
      return distance
    }
  }

  throw new Error("Expected to find a strong grade section")
}

function findPreClimbDistance(): number {
  for (let distance = 0; distance <= 20000; distance += 1) {
    const currentGrade = sampleGrade(distance)
    const futureGrade = sampleGrade(
      distance + FREE_RIDE_CAMERA.gradeHeightBiasLookAheadMeters
    )

    if (Math.abs(currentGrade) < 0.025 && futureGrade > 0.06) {
      return distance
    }
  }

  throw new Error("Expected to find an approaching climb")
}

function gradeBiasWindowIsFlat(distance: number): boolean {
  for (
    let offset = -FREE_RIDE_CAMERA.gradeHeightBiasTrailMeters;
    offset <= FREE_RIDE_CAMERA.gradeHeightBiasLookAheadMeters;
    offset += 5.5
  ) {
    if (Math.abs(sampleGrade(distance + offset)) > 0.018) return false
  }

  return true
}

function sampleGrade(distance: number): number {
  return sampleTrackInto(distance, sampleGradeScratch).grade
}

const sampleGradeScratch = createTrackSample()
