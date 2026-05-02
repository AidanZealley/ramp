import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useTimelineZoom } from "./use-timeline-zoom"
import { MAX_PIXELS_PER_SECOND, MIN_DURATION } from "@/lib/timeline/types"

class ResizeObserverMock {
  static callback: ResizeObserverCallback | null = null

  constructor(callback: ResizeObserverCallback) {
    ResizeObserverMock.callback = callback
  }

  observe() {}

  disconnect() {}
}

describe("useTimelineZoom", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    ResizeObserverMock.callback = null
  })

  it("fits very short workouts against the 10-second minimum duration", async () => {
    const container = document.createElement("div")
    const containerRef = { current: container }

    const { result } = renderHook(() =>
      useTimelineZoom({
        totalDurationSec: 0,
        containerRef,
        edgeGutterPx: 16,
      })
    )

    ResizeObserverMock.callback?.(
      [
        {
          contentRect: {
            width: 100,
            height: 0,
            x: 0,
            y: 0,
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            toJSON: () => ({}),
          },
        } as ResizeObserverEntry,
      ],
      {} as ResizeObserver
    )

    await waitFor(() => {
      expect(result.current.pixelsPerSecond).toBeCloseTo(
        (100 - 32) / MIN_DURATION
      )
    })
  })

  it("still respects the max pixels-per-second cap", async () => {
    const container = document.createElement("div")
    const containerRef = { current: container }

    const { result } = renderHook(() =>
      useTimelineZoom({
        totalDurationSec: 5,
        containerRef,
        edgeGutterPx: 0,
      })
    )

    ResizeObserverMock.callback?.(
      [
        {
          contentRect: {
            width: 500,
            height: 0,
            x: 0,
            y: 0,
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            toJSON: () => ({}),
          },
        } as ResizeObserverEntry,
      ],
      {} as ResizeObserver
    )

    await waitFor(() => {
      expect(result.current.pixelsPerSecond).toBe(MAX_PIXELS_PER_SECOND)
    })
  })
})
