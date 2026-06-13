import { describe, expect, it } from "vitest"
import { getNextTargetDroneDraftLocked } from "./draft-zone"

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
