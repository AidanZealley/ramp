import { describe, expect, it } from "vitest"
import {
  SEEK_TRANSITION_DURATION_MS,
  getPreservedSeekSpeedMps,
  getSeekTransitionGrade,
  interpolateNumber,
  smoothstep,
} from "./utils"

describe("route simulation seek transition utilities", () => {
  it("smoothstep clamps input and eases midpoint", () => {
    expect(smoothstep(-1)).toBe(0)
    expect(smoothstep(0)).toBe(0)
    expect(smoothstep(0.5)).toBe(0.5)
    expect(smoothstep(1)).toBe(1)
    expect(smoothstep(2)).toBe(1)
  })

  it("interpolates numbers with clamped progress", () => {
    expect(interpolateNumber(2, 10, -1)).toBe(2)
    expect(interpolateNumber(2, 10, 0.25)).toBe(4)
    expect(interpolateNumber(2, 10, 2)).toBe(10)
  })

  it("preserves valid seek speed and falls back for invalid values", () => {
    expect(getPreservedSeekSpeedMps(8)).toBe(8)
    expect(getPreservedSeekSpeedMps(0)).toBe(0)
    expect(getPreservedSeekSpeedMps(-1)).toBe(0)
    expect(getPreservedSeekSpeedMps(Number.NaN)).toBe(0)
    expect(getPreservedSeekSpeedMps(Number.POSITIVE_INFINITY)).toBe(0)
  })

  it("blends grade over the seek transition duration", () => {
    const base = {
      startedAtMs: 1_000,
      durationMs: SEEK_TRANSITION_DURATION_MS,
      fromGradePercent: 2,
      toGradePercent: 10,
    }

    expect(getSeekTransitionGrade({ ...base, nowMs: 1_000 })).toEqual({
      gradePercent: 2,
      progress: 0,
    })
    expect(getSeekTransitionGrade({ ...base, nowMs: 2_000 })).toEqual({
      gradePercent: 6,
      progress: 0.5,
    })
    expect(getSeekTransitionGrade({ ...base, nowMs: 3_000 })).toEqual({
      gradePercent: 10,
      progress: 1,
    })
  })
})
