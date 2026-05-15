import { describe, expect, it } from "vitest"
import { normalizeRouteTitle, validatePreviewPoints } from "./routes"

describe("routes helpers", () => {
  it("normalizes titles", () => {
    expect(normalizeRouteTitle("  Morning   Ride  ")).toBe("Morning Ride")
    expect(() => normalizeRouteTitle("   ")).toThrow("Route title")
  })

  it("validates bounded normalized preview points", () => {
    const points = Array.from({ length: 80 }, (_, index) => ({
      x: index / 79,
      y: 1 - index / 79,
    }))

    expect(validatePreviewPoints(points)).toBe(points)
    expect(() => validatePreviewPoints([...points, { x: 0, y: 0 }])).toThrow(
      "at most 80"
    )
    expect(() => validatePreviewPoints([{ x: 1.2, y: 0 }])).toThrow(
      "normalized"
    )
  })
})
