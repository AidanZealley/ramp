import { describe, expect, it } from "vitest"
import {
  averagePowerInWindow,
  calculateRampFtp,
  pruneSamples,
} from "./utils"
import type { PowerSample } from "./utils"

describe("calculateRampFtp", () => {
  it("returns 75% of the average rounded to an integer", () => {
    expect(calculateRampFtp(300)).toBe(225)
    expect(calculateRampFtp(266)).toBe(200) // 199.5 -> 200
  })

  it("returns null for missing or non-finite input", () => {
    expect(calculateRampFtp(null)).toBeNull()
    expect(calculateRampFtp(Number.NaN)).toBeNull()
    expect(calculateRampFtp(Number.POSITIVE_INFINITY)).toBeNull()
  })

  it("never returns a negative value", () => {
    expect(calculateRampFtp(0)).toBe(0)
  })
})

describe("averagePowerInWindow", () => {
  const samples: Array<PowerSample> = [
    { tMs: 0, powerWatts: 100 },
    { tMs: 30_000, powerWatts: 200 },
    { tMs: 60_000, powerWatts: 300 },
  ]

  it("averages only samples within the window", () => {
    // now=60_000, window=60_000 -> all three are within range
    expect(averagePowerInWindow(samples, 60_000, 60_000)).toBe(200)
  })

  it("excludes samples older than the window", () => {
    // now=61_000, window=60_000 -> drops the t=0 sample
    expect(averagePowerInWindow(samples, 61_000, 60_000)).toBe(250)
  })

  it("returns null when no samples fall in the window", () => {
    expect(averagePowerInWindow([], 1_000, 60_000)).toBeNull()
    expect(averagePowerInWindow(samples, 200_000, 60_000)).toBeNull()
  })

  it("ignores non-finite power samples", () => {
    const withNaN: Array<PowerSample> = [
      { tMs: 0, powerWatts: Number.NaN },
      { tMs: 0, powerWatts: 100 },
    ]
    expect(averagePowerInWindow(withNaN, 0, 60_000)).toBe(100)
  })
})

describe("pruneSamples", () => {
  it("drops samples older than the window in place", () => {
    const samples: Array<PowerSample> = [
      { tMs: 0, powerWatts: 100 },
      { tMs: 30_000, powerWatts: 200 },
      { tMs: 90_000, powerWatts: 300 },
    ]
    pruneSamples(samples, 95_000, 60_000)
    expect(samples).toEqual([{ tMs: 90_000, powerWatts: 300 }])
  })

  it("keeps all samples that are within the window", () => {
    const samples: Array<PowerSample> = [
      { tMs: 50_000, powerWatts: 100 },
      { tMs: 60_000, powerWatts: 200 },
    ]
    pruneSamples(samples, 60_000, 60_000)
    expect(samples).toHaveLength(2)
  })
})
