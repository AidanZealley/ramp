import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  getCooldownStartSeconds,
  getRampStartSeconds,
} from "../ramp-protocol"
import { useRampTestMonitor } from "./use-ramp-test-monitor"
import type { ExperienceSessionAPI } from "@/ride/experience-session"
import type {
  WorkoutSessionController,
  WorkoutSessionState,
} from "@ramp/ride-workouts"

type FakeSession = ExperienceSessionAPI & {
  notify: () => void
  setTelemetry: (patch: {
    powerWatts?: number | null
    cadenceRpm?: number | null
  }) => void
}

function createFakeSession(options: {
  powerWatts?: number | null
  cadenceRpm?: number | null
}): FakeSession {
  const listeners = new Set<() => void>()
  const state = {
    telemetry: {
      elapsedSeconds: 0,
      distanceMeters: 0,
      speedMps: null,
      powerWatts: options.powerWatts ?? 240,
      cadenceRpm: options.cadenceRpm ?? 90,
      heartRateBpm: null,
      trainerStatus: "ready" as const,
      telemetryStatus: "fresh" as const,
      lastTelemetryAtMs: 0,
      telemetryAgeMs: 0,
      telemetrySource: "simulated" as const,
    },
    trainerConnected: true,
    paused: false,
    activeControlMode: "experience" as const,
    lastError: null,
    lastTrainerError: null,
  }

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    subscribeFrame: () => () => undefined,
    pause: vi.fn(),
    resume: vi.fn(),
    controls: {
      dispatch: vi.fn(() => Promise.resolve({ ok: true as const })),
      getCapabilities: () => new Set(),
    },
    notify: () => listeners.forEach((listener) => listener()),
    setTelemetry: (patch) => {
      Object.assign(state.telemetry, patch)
    },
  }
}

function createFakeController(elapsedSeconds: number, targetWatts: number) {
  let workoutState: WorkoutSessionState = {
    activeWorkoutId: "ramp",
    activeSegmentLabel: null,
    activeSegmentIndex: 0,
    targetWatts,
    difficultyPercent: 100,
    isActive: true,
    elapsedSeconds,
    totalDurationSeconds: 2460,
    isComplete: false,
    controlStatus: "active",
    lastError: null,
  }
  const seekToElapsedSeconds = vi.fn((seconds: number) => {
    workoutState = { ...workoutState, elapsedSeconds: seconds }
    return Promise.resolve({ ok: true as const })
  })
  return {
    getState: () => workoutState,
    seekToElapsedSeconds,
    setElapsed: (seconds: number) => {
      workoutState = { ...workoutState, elapsedSeconds: seconds }
    },
  } as unknown as WorkoutSessionController & {
    setElapsed: (seconds: number) => void
    seekToElapsedSeconds: ReturnType<typeof vi.fn>
  }
}

describe("useRampTestMonitor", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("fails after cadence stays below 50 rpm for 3 s during the ramp", () => {
    // 20 s into a ramp step -> past the settle window.
    const controller = createFakeController(getRampStartSeconds() + 20, 240)
    const session = createFakeSession({ cadenceRpm: 40, powerWatts: 240 })

    const { result } = renderHook(() =>
      useRampTestMonitor({ session, workoutController: controller, active: true })
    )

    expect(result.current.failed).toBe(false)

    act(() => {
      vi.setSystemTime(3_000)
      session.notify()
    })

    expect(result.current.failed).toBe(true)
    expect(result.current.calculatedFtp).toBe(180) // 240 * 0.75
    expect(controller.seekToElapsedSeconds).toHaveBeenCalledWith(
      getCooldownStartSeconds()
    )
  })

  it("fails after power stays below 70% of target for 5 s", () => {
    const controller = createFakeController(getRampStartSeconds() + 20, 300)
    const session = createFakeSession({ cadenceRpm: 90, powerWatts: 120 })

    const { result } = renderHook(() =>
      useRampTestMonitor({ session, workoutController: controller, active: true })
    )

    act(() => {
      vi.setSystemTime(4_900)
      session.notify()
    })
    expect(result.current.failed).toBe(false)

    act(() => {
      vi.setSystemTime(5_000)
      session.notify()
    })
    expect(result.current.failed).toBe(true)
    expect(result.current.calculatedFtp).toBe(90) // 120 * 0.75
  })

  it("does not arm failure detection during the per-step settle window", () => {
    // 5 s into the step -> still settling.
    const controller = createFakeController(getRampStartSeconds() + 5, 240)
    const session = createFakeSession({ cadenceRpm: 40, powerWatts: 240 })

    const { result } = renderHook(() =>
      useRampTestMonitor({ session, workoutController: controller, active: true })
    )

    act(() => {
      vi.setSystemTime(5_000)
      session.notify()
    })

    expect(result.current.failed).toBe(false)
    expect(result.current.calculatedFtp).toBeNull()
    expect(controller.seekToElapsedSeconds).not.toHaveBeenCalled()
  })

  it("captures FTP without failure when the ramp completes into cooldown", () => {
    const controller = createFakeController(getCooldownStartSeconds(), 0)
    const session = createFakeSession({ cadenceRpm: 90, powerWatts: 400 })

    const { result } = renderHook(() =>
      useRampTestMonitor({ session, workoutController: controller, active: true })
    )

    expect(result.current.phase).toBe("cooldown")
    expect(result.current.failed).toBe(false)
    expect(result.current.calculatedFtp).toBe(300) // 400 * 0.75
    expect(controller.seekToElapsedSeconds).not.toHaveBeenCalled()
  })
})
