// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  RideSessionContext,
  useRideFrame,
  useRideFrameRef,
  useRideHeartbeat,
  useRideSelector,
  useRideSession,
  useRideSessionContext,
  useRideThrottledSelector,
} from "./index"
import type {
  Capability,
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
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    subscribeFrame: (listener: (frame: RideFrameData) => void) => {
      frameListeners.add(listener)
      return () => frameListeners.delete(listener)
    },
  }
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
  afterEach(() => {
    vi.useRealTimers()
  })

  it("throws when context is missing", () => {
    expect(() => renderHook(() => useRideSessionContext())).toThrow(
      "RideSessionContext is missing"
    )
  })

  it("reads the session context", () => {
    const { session } = createSession()
    const contextSession = {
      ...session,
      getLatestTelemetry: () => null,
      connectTrainer: vi.fn(),
      disconnectTrainer: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      dispose: vi.fn(),
      controls: {
        dispatch: vi.fn(async () => ({ ok: true as const })),
        getCapabilities: vi.fn(() => new Set<Capability>()),
      },
    } satisfies RideSessionController
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RideSessionContext.Provider value={contextSession}>
        {children}
      </RideSessionContext.Provider>
    )

    const { result } = renderHook(() => useRideSessionContext(), { wrapper })

    expect(result.current).toBe(contextSession)
  })

  it("updates selector results", () => {
    const harness = createSession()
    const { result } = renderHook(() =>
      useRideSelector(harness.session, (s) => s.trainerConnected)
    )

    act(() => harness.setState(state(true)))

    expect(result.current).toBe(true)
  })

  it("reads session state from a minimal conforming store", () => {
    const harness = createSession()
    const { result } = renderHook(() => useRideSession(harness.session))

    expect(result.current.trainerConnected).toBe(false)

    act(() => harness.setState(state(true)))

    expect(result.current.trainerConnected).toBe(true)
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

  it("updates a ride frame ref without re-rendering", () => {
    const harness = createSession()
    const { result, unmount } = renderHook(() =>
      useRideFrameRef(harness.session)
    )
    expect(result.current.current).toBeNull()

    const frame = {
      telemetry: null,
      elapsedSeconds: 1,
      distanceMeters: 2,
      deltaMs: 100,
    }
    act(() => harness.emitFrame(frame))
    expect(result.current.current).toBe(frame)

    unmount()
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
  })

  it("does not re-render selector consumers for non-selected state changes", () => {
    const harness = createSession()
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1
      return useRideSelector(harness.session, (s) => s.trainerConnected)
    })

    act(() =>
      harness.setState({
        ...state(false),
        telemetry: { ...state(false).telemetry, elapsedSeconds: 10 },
      })
    )

    expect(result.current).toBe(false)
    expect(renders).toBe(1)
  })

  it("uses custom equality for selector results", () => {
    const harness = createSession()
    let renders = 0
    renderHook(() => {
      renders += 1
      return useRideSelector(
        harness.session,
        (s) => ({ connected: s.trainerConnected }),
        (left, right) => left.connected === right.connected
      )
    })

    act(() =>
      harness.setState({
        ...state(false),
        telemetry: { ...state(false).telemetry, elapsedSeconds: 10 },
      })
    )

    expect(renders).toBe(1)
  })

  it("uses the latest ride frame callback after rerender", () => {
    const harness = createSession()
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(
      ({ callback }) => useRideFrame(harness.session, callback),
      { initialProps: { callback: first } }
    )

    rerender({ callback: second })
    act(() =>
      harness.emitFrame({
        telemetry: null,
        elapsedSeconds: 1,
        distanceMeters: 2,
        deltaMs: 100,
      })
    )

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
