import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useIntervalDrag } from "./use-interval-drag"
import type { Interval } from "@/lib/workout-utils"

function createPointerEvent(clientX: number, clientY = 0) {
  return {
    clientX,
    clientY,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as React.PointerEvent
}

describe("useIntervalDrag", () => {
  it("snaps right-edge duration drags in 10-second increments", () => {
    const onPreviewChange = vi.fn()
    const onCommit = vi.fn()
    const intervals: Array<Interval> = [
      { startPower: 100, endPower: 100, durationSeconds: 30 },
    ]

    const { result } = renderHook(() =>
      useIntervalDrag({
        intervals,
        pixelsPerSecond: 2,
        onPreviewChange,
        onCommit,
      })
    )

    act(() => {
      result.current.startDrag(createPointerEvent(0), "duration", 0)
    })

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 20 }))
    })

    expect(onPreviewChange).toHaveBeenLastCalledWith([
      { startPower: 100, endPower: 100, durationSeconds: 40 },
    ])

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup"))
    })

    expect(onCommit).toHaveBeenCalledWith([
      { startPower: 100, endPower: 100, durationSeconds: 40 },
    ])
  })

  it("preserves total duration while clamping adjacent left-edge resizes at 10 seconds", () => {
    const onPreviewChange = vi.fn()
    const onCommit = vi.fn()
    const intervals: Array<Interval> = [
      { startPower: 100, endPower: 100, durationSeconds: 10 },
      { startPower: 120, endPower: 120, durationSeconds: 20 },
    ]

    const { result } = renderHook(() =>
      useIntervalDrag({
        intervals,
        pixelsPerSecond: 1,
        onPreviewChange,
        onCommit,
      })
    )

    act(() => {
      result.current.startDrag(createPointerEvent(0), "duration-left", 1)
    })

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: -20 }))
    })

    expect(onPreviewChange).toHaveBeenLastCalledWith([
      { startPower: 100, endPower: 100, durationSeconds: 10 },
      { startPower: 120, endPower: 120, durationSeconds: 20 },
    ])

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 10 }))
    })

    expect(onPreviewChange).toHaveBeenLastCalledWith([
      { startPower: 100, endPower: 100, durationSeconds: 20 },
      { startPower: 120, endPower: 120, durationSeconds: 10 },
    ])

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup"))
    })

    expect(onCommit).toHaveBeenCalledWith([
      { startPower: 100, endPower: 100, durationSeconds: 20 },
      { startPower: 120, endPower: 120, durationSeconds: 10 },
    ])
  })
})
