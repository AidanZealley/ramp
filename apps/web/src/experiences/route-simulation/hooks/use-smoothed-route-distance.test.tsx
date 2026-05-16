import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useSmoothedRouteDistance } from "./use-smoothed-route-distance"

describe("useSmoothedRouteDistance", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    let now = 0
    vi.spyOn(performance, "now").mockImplementation(() => now)
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      return window.setTimeout(() => {
        now += 16
        callback(now)
      }, 16)
    })
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      window.clearTimeout(id)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("returns the target distance on initial render", () => {
    const { result } = renderHook(() => useSmoothedRouteDistance(42))

    expect(result.current).toBe(42)
  })

  it("snaps large distance jumps instead of animating", () => {
    const { result, rerender } = renderHook(
      ({ distanceMeters }) => useSmoothedRouteDistance(distanceMeters),
      { initialProps: { distanceMeters: 0 } }
    )

    rerender({ distanceMeters: 150 })

    expect(result.current).toBe(150)
  })

  it("animates small updates toward the target", () => {
    const { result, rerender } = renderHook(
      ({ distanceMeters }) => useSmoothedRouteDistance(distanceMeters),
      { initialProps: { distanceMeters: 0 } }
    )

    act(() => {
      vi.advanceTimersByTime(160)
    })
    rerender({ distanceMeters: 50 })

    expect(result.current).toBe(0)

    act(() => {
      vi.advanceTimersByTime(80)
    })

    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(50)

    act(() => {
      vi.advanceTimersByTime(160)
    })

    expect(result.current).toBe(50)
  })
})
