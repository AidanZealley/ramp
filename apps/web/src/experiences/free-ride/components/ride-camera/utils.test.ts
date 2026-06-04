import { describe, expect, it } from "vitest"
import { FREE_RIDE_CAMERA, FREE_RIDE_MOTION } from "../../free-ride-config"
import { getLateralCurvature } from "../../track"
import { getGradeHeightBiasTarget, getYawDriftTarget } from "./utils"

describe("getGradeHeightBiasTarget", () => {
  it("returns zero on flat grades", () => {
    expect(getGradeHeightBiasTarget(0)).toBe(0)
  })

  it("returns negative bias on positive grades", () => {
    expect(getGradeHeightBiasTarget(0.05)).toBeLessThan(0)
  })

  it("returns positive bias on negative grades", () => {
    expect(getGradeHeightBiasTarget(-0.05)).toBeGreaterThan(0)
  })

  it("reaches configured magnitude at the full positive grade threshold", () => {
    const fullGrade = FREE_RIDE_CAMERA.gradeHeightBiasFullGradePercent / 100

    expect(getGradeHeightBiasTarget(fullGrade)).toBeCloseTo(
      -FREE_RIDE_CAMERA.gradeHeightBiasMeters
    )
  })

  it("reaches configured magnitude at the full negative grade threshold", () => {
    const fullGrade = -FREE_RIDE_CAMERA.gradeHeightBiasFullGradePercent / 100

    expect(getGradeHeightBiasTarget(fullGrade)).toBeCloseTo(
      FREE_RIDE_CAMERA.gradeHeightBiasMeters
    )
  })

  it("clamps beyond the full-grade threshold", () => {
    const fullGrade = FREE_RIDE_CAMERA.gradeHeightBiasFullGradePercent / 100

    expect(getGradeHeightBiasTarget(fullGrade * 2)).toBeCloseTo(
      -FREE_RIDE_CAMERA.gradeHeightBiasMeters
    )
    expect(getGradeHeightBiasTarget(fullGrade * -2)).toBeCloseTo(
      FREE_RIDE_CAMERA.gradeHeightBiasMeters
    )
  })

  it("returns finite values across realistic steep grades", () => {
    for (let grade = -0.3; grade <= 0.3; grade += 0.01) {
      expect(Number.isFinite(getGradeHeightBiasTarget(grade))).toBe(true)
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
      if (Math.abs(curvature) < 0.0005 || !yawDriftWindowMatchesSign(distance)) {
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
