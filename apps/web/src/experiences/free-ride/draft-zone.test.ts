import { describe, expect, it } from "vitest"
import {
  getNextTargetDroneDraftLocked,
  getTargetDroneDraftQuality,
} from "./draft-zone"

describe("getNextTargetDroneDraftLocked", () => {
  it("keeps unlocked state false above 5m", () => {
    expect(
      getNextTargetDroneDraftLocked({
        currentDraftLocked: false,
        gapMeters: 5.01,
      })
    ).toBe(false)
  })

  it("locks at exactly 5m", () => {
    expect(
      getNextTargetDroneDraftLocked({
        currentDraftLocked: false,
        gapMeters: 5,
      })
    ).toBe(true)
  })

  it("locks below 5m", () => {
    expect(
      getNextTargetDroneDraftLocked({
        currentDraftLocked: false,
        gapMeters: 4.5,
      })
    ).toBe(true)
  })

  it("keeps locked state true at 5m", () => {
    expect(
      getNextTargetDroneDraftLocked({
        currentDraftLocked: true,
        gapMeters: 5,
      })
    ).toBe(true)
  })

  it("keeps locked state true at 8m", () => {
    expect(
      getNextTargetDroneDraftLocked({
        currentDraftLocked: true,
        gapMeters: 8,
      })
    ).toBe(true)
  })

  it("unlocks above 8m", () => {
    expect(
      getNextTargetDroneDraftLocked({
        currentDraftLocked: true,
        gapMeters: 8.01,
      })
    ).toBe(false)
  })

  it("returns false for invalid gaps", () => {
    for (const gapMeters of [Number.NaN, Infinity, -Infinity]) {
      expect(
        getNextTargetDroneDraftLocked({
          currentDraftLocked: true,
          gapMeters,
        })
      ).toBe(false)
    }
  })

  it("does not throw for representative finite gaps", () => {
    for (const gapMeters of [-1, 0, 4.99, 5, 6.5, 8, 8.01, 100]) {
      expect(() =>
        getNextTargetDroneDraftLocked({
          currentDraftLocked: gapMeters < 7,
          gapMeters,
        })
      ).not.toThrow()
    }
  })
})

describe("getTargetDroneDraftQuality", () => {
  it("returns 0 when unlocked at 5m", () => {
    expect(
      getTargetDroneDraftQuality({ draftLocked: false, gapMeters: 5 })
    ).toBe(0)
  })

  it("returns 0 for invalid gaps even when locked", () => {
    for (const gapMeters of [Number.NaN, Infinity, -Infinity]) {
      expect(
        getTargetDroneDraftQuality({ draftLocked: true, gapMeters })
      ).toBe(0)
    }
  })

  it("returns 1 when locked at exactly 5m", () => {
    expect(
      getTargetDroneDraftQuality({ draftLocked: true, gapMeters: 5 })
    ).toBe(1)
  })

  it("returns 1 when locked below 5m", () => {
    expect(
      getTargetDroneDraftQuality({ draftLocked: true, gapMeters: 4.5 })
    ).toBe(1)
  })

  it("returns approximately 0.5 when locked at 6.5m", () => {
    expect(
      getTargetDroneDraftQuality({ draftLocked: true, gapMeters: 6.5 })
    ).toBeCloseTo(0.5)
  })

  it("returns 0 when locked at exactly 8m", () => {
    expect(
      getTargetDroneDraftQuality({ draftLocked: true, gapMeters: 8 })
    ).toBe(0)
  })

  it("returns 0 when locked above 8m", () => {
    expect(
      getTargetDroneDraftQuality({ draftLocked: true, gapMeters: 8.5 })
    ).toBe(0)
  })

  it("always returns a finite value in [0, 1] for representative finite gaps", () => {
    for (const gapMeters of [-1, 0, 4.99, 5, 6.5, 8, 8.01, 100]) {
      const quality = getTargetDroneDraftQuality({
        draftLocked: true,
        gapMeters,
      })
      expect(Number.isFinite(quality)).toBe(true)
      expect(quality).toBeGreaterThanOrEqual(0)
      expect(quality).toBeLessThanOrEqual(1)
    }
  })
})
