import { describe, expect, it, vi } from "vitest"
import { narrowForExperience } from "./experience-session"
import type {
  Capability,
  RideSessionController,
  RideSessionState,
} from "@ramp/ride-core"

const state: RideSessionState = {
  telemetry: {
    elapsedSeconds: 0,
    distanceMeters: 0,
    speedMps: null,
    powerWatts: null,
    cadenceRpm: null,
    heartRateBpm: null,
    trainerStatus: "disconnected",
    telemetryStatus: "missing",
    lastTelemetryAtMs: null,
    telemetryAgeMs: null,
    telemetrySource: null,
  },
  trainerConnected: false,
  paused: false,
  activeControlMode: "manual",
  lastError: null,
  lastTrainerError: null,
}

function createSession() {
  const capabilities = new Set<Capability>()
  return {
    getState: vi.fn(() => state),
    getLatestTelemetry: vi.fn(() => null),
    subscribe: vi.fn(() => vi.fn()),
    subscribeFrame: vi.fn(() => vi.fn()),
    connectTrainer: vi.fn(),
    disconnectTrainer: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    dispose: vi.fn(),
    controls: {
      dispatch: vi.fn(async () => ({ ok: true as const })),
      getCapabilities: vi.fn(() => capabilities),
    },
  } satisfies RideSessionController
}

describe("experience session boundary", () => {
  it("does not expose privileged session operations", () => {
    const api = narrowForExperience(createSession())

    expect("connectTrainer" in api).toBe(false)
    expect("disconnectTrainer" in api).toBe(false)
    expect("dispose" in api).toBe(false)
    expect("getLatestTelemetry" in api).toBe(false)
  })

  it("locks dispatch source to experience", async () => {
    const session = createSession()
    const api = narrowForExperience(session)
    const command = { type: "setResistance", level: 35 } as const
    const options = { delivery: "acknowledged" } as const

    await api.controls.dispatch(command, "user" as "experience", options)

    expect(session.controls.dispatch).toHaveBeenCalledWith(
      command,
      "experience",
      options
    )
  })

  it("delegates store, frame, pause, and resume methods", () => {
    const session = createSession()
    const api = narrowForExperience(session)
    const listener = vi.fn()
    const frameListener = vi.fn()

    api.getState()
    api.subscribe(listener)
    api.subscribeFrame(frameListener)
    api.pause()
    api.resume()

    expect(session.getState).toHaveBeenCalled()
    expect(session.subscribe).toHaveBeenCalledWith(listener)
    expect(session.subscribeFrame).toHaveBeenCalledWith(frameListener)
    expect(session.pause).toHaveBeenCalled()
    expect(session.resume).toHaveBeenCalled()
  })

  it("delegates capabilities reads", () => {
    const session = createSession()
    const api = narrowForExperience(session)

    expect(api.controls.getCapabilities()).toBe(
      session.controls.getCapabilities()
    )
  })
})
