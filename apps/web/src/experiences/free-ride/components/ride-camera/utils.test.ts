import { describe, expect, it } from "vitest"
import { FREE_RIDE_CAMERA } from "../../free-ride-config"
import { getGradeHeightBiasTarget } from "./utils"

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
