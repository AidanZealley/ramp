import { describe, expect, it } from "vitest"
import { getWorkoutStats } from "./workout-utils"

describe("getWorkoutStats", () => {
  it("returns zeroed stats for an empty workout", () => {
    expect(getWorkoutStats([])).toEqual({
      totalDurationSeconds: 0,
      averagePower: 0,
      normalizedPower: 0,
      intensityFactor: 0,
      stressScore: 0,
      zoneDurations: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
      },
      zonePercentages: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
      },
    })
  })

  it("computes expected metrics for a one-hour threshold ride", () => {
    const stats = getWorkoutStats([
      {
        startPower: 100,
        endPower: 100,
        durationSeconds: 3600,
      },
    ])

    expect(stats.totalDurationSeconds).toBe(3600)
    expect(stats.averagePower).toBe(100)
    expect(stats.normalizedPower).toBeCloseTo(100, 6)
    expect(stats.intensityFactor).toBeCloseTo(1, 6)
    expect(stats.stressScore).toBeCloseTo(100, 6)
    expect(stats.zoneDurations[4]).toBe(3600)
    expect(stats.zonePercentages[4]).toBeCloseTo(100, 6)
  })

  it("splits zone time across intervals and derives stress from intensity", () => {
    const stats = getWorkoutStats([
      {
        startPower: 50,
        endPower: 50,
        durationSeconds: 1800,
      },
      {
        startPower: 100,
        endPower: 100,
        durationSeconds: 1800,
      },
    ])

    expect(stats.totalDurationSeconds).toBe(3600)
    expect(stats.averagePower).toBe(75)
    expect(stats.zoneDurations[1]).toBe(1800)
    expect(stats.zoneDurations[4]).toBe(1800)
    expect(stats.zonePercentages[1]).toBeCloseTo(50, 6)
    expect(stats.zonePercentages[4]).toBeCloseTo(50, 6)
    expect(stats.normalizedPower).toBeGreaterThan(stats.averagePower)
    expect(stats.stressScore).toBeGreaterThan(0)
    expect(stats.stressScore).toBeLessThan(100)
  })
})
