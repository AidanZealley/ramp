// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import {
  RideSessionContext,
  useRideFrame,
  useRideHeartbeat,
  useRideSelector,
  useRideSessionContext,
  useRideThrottledSelector,
} from "./index"
import type {
  RideFrameData,
  RideSessionController,
  RideSessionState,
} from "@ramp/ride-core"
import type { ReactNode } from "react"

const state = (connected: boolean): RideSessionState => ({
  telemetry: {
    elapsedSeconds: 0,
    distanceMeters: 0,
    speedMps: null,
    powerWatts: null,
    cadenceRpm: null,
    heartRateBpm: null,
    trainerStatus: connected ? "ready" : "disconnected",
    telemetryStatus: "missing",
    lastTelemetryAtMs: null,
    telemetryAgeMs: null,
    telemetrySource: null,
  },
  trainerConnected: connected,
  paused: false,
  activeControlMode: "manual",
  lastError: null,
  lastTrainerError: null,
})

function createSession() {
  let current = state(false)
  const listeners = new Set<() => void>()
  const frameListeners = new Set<(frame: RideFrameData) => void>()
  const session = {
    getState: () => current,
    getLatestTelemetry: () => null,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    subscribeFrame: (listener: (frame: RideFrameData) => void) => {
      frameListeners.add(listener)
      return () => frameListeners.delete(listener)
    },
    connectTrainer: vi.fn(),
    disconnectTrainer: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    dispose: vi.fn(),
    controls: {} as RideSessionController["controls"],
  } satisfies RideSessionController
  return {
    session,
    setState(next: RideSessionState) {
      current = next
      for (const listener of listeners) listener()
    },
    emitFrame(frame: RideFrameData) {
      for (const listener of frameListeners) listener(frame)
    },
  }
}

describe("ride-react", () => {
  it("throws when context is missing", () => {
    expect(() => renderHook(() => useRideSessionContext())).toThrow(
      "RideSessionContext is missing"
    )
  })

  it("reads the session context", () => {
    const { session } = createSession()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RideSessionContext.Provider value={session}>
        {children}
      </RideSessionContext.Provider>
    )

    const { result } = renderHook(() => useRideSessionContext(), { wrapper })

    expect(result.current).toBe(session)
  })

  it("updates selector results", () => {
    const harness = createSession()
    const { result } = renderHook(() =>
      useRideSelector(harness.session, (s) => s.trainerConnected)
    )

    act(() => harness.setState(state(true)))

    expect(result.current).toBe(true)
  })

  it("throttles selector updates", () => {
    vi.useFakeTimers()
    const harness = createSession()
    const { result, unmount } = renderHook(() =>
      useRideThrottledSelector(harness.session, (s) => s.trainerConnected, {
        hz: 10,
      })
    )

    act(() => harness.setState(state(true)))
    expect(result.current).toBe(false)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe(true)

    unmount()
    vi.useRealTimers()
  })

  it("subscribes to ride frames", () => {
    const harness = createSession()
    const callback = vi.fn()
    renderHook(() => useRideFrame(harness.session, callback))

    const frame = {
      telemetry: null,
      elapsedSeconds: 1,
      distanceMeters: 2,
      deltaMs: 100,
    }
    act(() => harness.emitFrame(frame))

    expect(callback).toHaveBeenCalledWith(frame)
  })

  it("emits heartbeat counts", () => {
    vi.useFakeTimers()
    const { session } = createSession()
    const { result, unmount } = renderHook(() => useRideHeartbeat(session, 2))

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe(1)
    unmount()
    vi.useRealTimers()
  })
})
