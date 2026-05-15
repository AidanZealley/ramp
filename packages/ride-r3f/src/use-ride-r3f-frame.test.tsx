// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useRideR3FFrame } from "./use-ride-r3f-frame"
import type { RideFrameData, RideSessionController } from "@ramp/ride-core"

describe("useRideR3FFrame", () => {
  it("updates the ref from frame subscription and unsubscribes on unmount", () => {
    const listeners = new Set<(frame: RideFrameData) => void>()
    const unsubscribe = vi.fn()
    const session = {
      subscribeFrame: (listener: (frame: RideFrameData) => void) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
          unsubscribe()
        }
      },
    } as RideSessionController

    const { result, unmount } = renderHook(() => useRideR3FFrame(session))
    expect(result.current.current).toBeNull()

    const frame = {
      telemetry: null,
      elapsedSeconds: 1,
      distanceMeters: 2,
      deltaMs: 100,
    }
    act(() => {
      for (const listener of listeners) listener(frame)
    })
    expect(result.current.current).toBe(frame)

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
    expect(listeners.size).toBe(0)
  })
})
