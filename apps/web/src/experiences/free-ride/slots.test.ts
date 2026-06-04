import { describe, expect, it } from "vitest"
import { firstSlotIndex, forEachSlot } from "./slots"

describe("firstSlotIndex", () => {
  const window = { spacing: 24, back: 20, ahead: 340 }

  it("stays unchanged while the active slot window has not advanced", () => {
    const first = firstSlotIndex(100, window)

    expect(firstSlotIndex(101, window)).toBe(first)
    expect(firstSlotIndex(115.9, window)).toBe(first)
  })

  it("advances when the first active slot changes", () => {
    expect(firstSlotIndex(100, window)).not.toBe(firstSlotIndex(121, window))
  })

  it("matches forEachSlot's first stable slot id", () => {
    let visitedFirst: number | null = null

    forEachSlot(315, window, (_slotIndex, k) => {
      if (visitedFirst === null) visitedFirst = k
    })

    expect(visitedFirst).toBe(firstSlotIndex(315, window))
  })
})
