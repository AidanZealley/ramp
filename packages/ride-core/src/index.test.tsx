// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createRideSession } from "./controller"
import { useRideSession } from "./use-ride-session"
import {
  Capability,
  type RideTrainerAdapter,
  type TrainerCommand,
} from "./index"
import type {
  RideTrainerConnectionState,
  RideTrainerError,
  RideTrainerTelemetry,
} from "./types"

class TestTrainer implements RideTrainerAdapter {
  readonly capabilities: RideTrainerAdapter["capabilities"]
  private telemetryListener: ((t: RideTrainerTelemetry) => void) | null = null
  private stateListener: ((s: RideTrainerConnectionState) => void) | null = null
  private errorListener: ((e: RideTrainerError) => void) | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private targetWatts: number | null = null

  constructor(
    private readonly now: () => number = () => Date.now(),
    capabilities = new Set(Object.values(Capability))
  ) {
    this.capabilities = capabilities
  }

  connect(): Promise<void> {
    this.stateListener?.({ kind: "connecting" })
    this.stateListener?.({ kind: "connected" })
    this.telemetryListener?.(this.telemetry())
    this.timer = setInterval(() => {
      this.telemetryListener?.(this.telemetry())
    }, 100)
    return Promise.resolve()
  }

  disconnect(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.stateListener?.({ kind: "disconnected" })
    return Promise.resolve()
  }

  async sendCommand(command: TrainerCommand): Promise<void> {
    if (command.type === "setTargetPower") this.targetWatts = command.watts
    if (command.type === "disconnect") await this.disconnect()
  }

  subscribeTelemetry(listener: (t: RideTrainerTelemetry) => void): () => void {
    this.telemetryListener = listener
    return () => {
      if (this.telemetryListener === listener) this.telemetryListener = null
    }
  }

  subscribeState(
    listener: (s: RideTrainerConnectionState) => void
  ): () => void {
    this.stateListener = listener
    return () => {
      if (this.stateListener === listener) this.stateListener = null
    }
  }

  subscribeError(listener: (e: RideTrainerError) => void): () => void {
    this.errorListener = listener
    return () => {
      if (this.errorListener === listener) this.errorListener = null
    }
  }

  pushTelemetry(partial: Partial<RideTrainerTelemetry> = {}) {
    this.telemetryListener?.({
      ...this.telemetry(),
      ...partial,
      timestampMs: this.now(),
    })
  }

  private telemetry(): RideTrainerTelemetry {
    return {
      powerWatts: this.targetWatts ?? 180,
      cadenceRpm: 90,
      speedMps: 8,
      heartRateBpm: null,
      timestampMs: this.now(),
      source: "mock",
    }
  }
}

class DeferredConnectTrainer extends TestTrainer {
  private resolveConnect: (() => void) | null = null

  override async connect(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.resolveConnect = resolve
    })
  }

  finishConnect(): void {
    this.resolveConnect?.()
  }
}

class FailingConnectTrainer extends TestTrainer {
  override async connect(): Promise<void> {
    throw {
      code: "transport",
      message: "connect failed",
    } satisfies RideTrainerError
  }
}

describe("ride-core", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("connects a trainer and updates ready state", async () => {
    const session = createRideSession()
    await session.connectTrainer(new TestTrainer())

    expect(session.getState().trainerConnected).toBe(true)
    expect(session.getState().telemetry.trainerStatus).toBe("ready")
  })

  it("rejects unsupported capabilities", async () => {
    const session = createRideSession()
    await session.connectTrainer(
      new TestTrainer(() => Date.now(), new Set([Capability.ReadPower]))
    )

    await expect(
      session.controls.dispatch({ type: "setTargetPower", watts: 200 }, "user")
    ).resolves.toEqual({ ok: false, reason: "capability-unsupported" })
  })

  it("rejects invalid trainer commands before enqueueing", async () => {
    const session = createRideSession()
    await session.connectTrainer(new TestTrainer())

    await expect(
      session.controls.dispatch({ type: "setTargetPower", watts: -1 }, "user")
    ).resolves.toEqual({
      ok: false,
      reason: "invalid-command:setTargetPower.watts:out-of-range",
    })
  })

  it("coalesces simulation grade commands to the latest value", async () => {
    const trainer = new TestTrainer()
    const sendCommand = vi.spyOn(trainer, "sendCommand")
    const session = createRideSession()
    await session.connectTrainer(trainer)

    for (let index = 0; index < 5; index += 1) {
      await session.controls.dispatch(
        { type: "setSimulationGrade", gradePercent: index },
        "experience"
      )
    }

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })

    expect(sendCommand).toHaveBeenCalledWith({
      type: "setSimulationGrade",
      gradePercent: 4,
    })
  })

  it("leaves a recoverable error state after connect failure", async () => {
    const session = createRideSession()

    await session.connectTrainer(new FailingConnectTrainer())

    expect(session.getState()).toMatchObject({
      trainerConnected: false,
      lastError: "connect failed",
      lastTrainerError: { code: "transport", message: "connect failed" },
      telemetry: {
        trainerStatus: "error",
        telemetryStatus: "missing",
      },
    })
  })

  it("does not mark connected when connect resolves after disconnect", async () => {
    const trainer = new DeferredConnectTrainer()
    const session = createRideSession()
    const connect = session.connectTrainer(trainer)

    await session.disconnectTrainer()
    trainer.finishConnect()
    await connect

    expect(session.getState().trainerConnected).toBe(false)
    expect(session.getState().telemetry.trainerStatus).toBe("disconnected")
  })

  it("stops distance and elapsed progression after telemetry goes stale", async () => {
    let nowMs = 0
    const trainer = new TestTrainer(() => nowMs)
    const session = createRideSession({
      now: () => nowMs,
      telemetryIntervalMs: 100,
      flushIntervalMs: 50,
      telemetryStaleAfterMs: 2000,
    })
    await session.connectTrainer(trainer)

    await act(async () => {
      nowMs = 1000
      await vi.advanceTimersByTimeAsync(1000)
    })
    const freshState = session.getState()
    expect(freshState.telemetry.telemetryStatus).toBe("fresh")
    expect(freshState.telemetry.elapsedSeconds).toBeGreaterThan(0)
    expect(freshState.telemetry.distanceMeters).toBeGreaterThan(0)

    const staleElapsed = freshState.telemetry.elapsedSeconds
    const staleDistance = freshState.telemetry.distanceMeters

    await trainer.disconnect()
    await act(async () => {
      nowMs = 3200
      await vi.advanceTimersByTimeAsync(2200)
    })

    const staleState = session.getState()
    expect(staleState.telemetry.telemetryStatus).toBe("stale")
    expect(staleState.telemetry.elapsedSeconds).toBe(staleElapsed)
    expect(staleState.telemetry.distanceMeters).toBe(staleDistance)

    trainer.pushTelemetry()
    await act(async () => {
      await Promise.resolve()
    })

    expect(session.getState().telemetry.telemetryStatus).toBe("stale")

    await act(async () => {
      nowMs = 3300
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(session.getState().telemetry.telemetryStatus).toBe("fresh")
  })

  it("clears pending commands across reconnect boundaries", async () => {
    const firstTrainer = new TestTrainer()
    const secondTrainer = new TestTrainer()
    const firstSend = vi.spyOn(firstTrainer, "sendCommand")
    const secondSend = vi.spyOn(secondTrainer, "sendCommand")
    const session = createRideSession()
    await session.connectTrainer(firstTrainer)

    await session.controls.dispatch(
      { type: "setTargetPower", watts: 225 },
      "user"
    )
    await session.disconnectTrainer()
    await session.connectTrainer(secondTrainer)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(firstSend).not.toHaveBeenCalled()
    expect(secondSend).not.toHaveBeenCalled()
  })

  it("retries a pending command after a send failure with backoff", async () => {
    const trainer = new TestTrainer()
    const sendCommand = vi.spyOn(trainer, "sendCommand")
    sendCommand.mockRejectedValueOnce(new Error("temporary failure"))
    const session = createRideSession()
    await session.connectTrainer(trainer)

    await session.controls.dispatch(
      { type: "setTargetPower", watts: 225 },
      "user",
      { priority: "immediate" }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(session.getState().lastError).toBe("temporary failure")

    // Backoff is ~100ms for first retry (+ jitter), so wait enough for backoff
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })

    expect(sendCommand).toHaveBeenCalledTimes(2)
  })

  it("serializes command writes globally across keys", async () => {
    const trainer = new TestTrainer()
    const release: Array<() => void> = []
    const sendCommand = vi.spyOn(trainer, "sendCommand").mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release.push(resolve)
        })
    )
    const session = createRideSession()
    await session.connectTrainer(trainer)

    await session.controls.dispatch(
      { type: "setTargetPower", watts: 225 },
      "user",
      { priority: "immediate" }
    )
    await session.controls.dispatch(
      { type: "setSimulationGrade", gradePercent: 3 },
      "experience",
      { priority: "immediate" }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(sendCommand).toHaveBeenCalledTimes(1)

    release.shift()?.()
    await act(async () => {
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(sendCommand).toHaveBeenCalledTimes(2)
  })

  it("sends immediate commands before normal queued commands", async () => {
    const trainer = new TestTrainer()
    const sendCommand = vi.spyOn(trainer, "sendCommand")
    const session = createRideSession()
    await session.connectTrainer(trainer)

    await session.controls.dispatch(
      { type: "setSimulationGrade", gradePercent: 4 },
      "experience"
    )
    await session.controls.dispatch(
      { type: "setTargetPower", watts: 230 },
      "user",
      { priority: "immediate" }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })

    expect(sendCommand.mock.calls[0]?.[0]).toEqual({
      type: "setTargetPower",
      watts: 230,
    })
  })

  it("notifies the React hook after telemetry ticks", async () => {
    const session = createRideSession()
    await session.connectTrainer(new TestTrainer())
    const { result } = renderHook(() => useRideSession(session))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(result.current.telemetry.elapsedSeconds).toBeGreaterThan(0)
  })

  it("re-exports trainer contracts through the public API", () => {
    const command: TrainerCommand = { type: "setTargetPower", watts: 215 }

    expect(Capability.TargetPower).toBe("write.targetPower")
    expect(command.type).toBe("setTargetPower")
  })

  it("rejects with timeout code when connect takes too long", async () => {
    const session = createRideSession({ connectTimeoutMs: 500 })
    const trainer = new DeferredConnectTrainer()

    const connectPromise = session.connectTrainer(trainer)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    await connectPromise

    expect(session.getState()).toMatchObject({
      trainerConnected: false,
      lastError: "Trainer connect timed out",
      lastTrainerError: { code: "timeout", message: "Trainer connect timed out" },
      telemetry: {
        trainerStatus: "error",
      },
    })
  })

  it("clears error state after a successful command send", async () => {
    const trainer = new TestTrainer()
    const sendCommand = vi.spyOn(trainer, "sendCommand")
    sendCommand.mockRejectedValueOnce(new Error("transient failure"))
    const session = createRideSession()
    await session.connectTrainer(trainer)

    await session.controls.dispatch(
      { type: "setTargetPower", watts: 200 },
      "user",
      { priority: "immediate" }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(session.getState().lastError).toBe("transient failure")

    // Second dispatch succeeds
    await session.controls.dispatch(
      { type: "setTargetPower", watts: 210 },
      "user",
      { priority: "immediate" }
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })

    expect(session.getState().lastError).toBeNull()
    expect(session.getState().telemetry.trainerStatus).toBe("ready")
  })

  it("cleans up superseded trainer on concurrent connect", async () => {
    const session = createRideSession()
    const firstTrainer = new DeferredConnectTrainer()
    const secondTrainer = new TestTrainer()
    const firstDisconnect = vi.spyOn(firstTrainer, "disconnect")

    const connect1 = session.connectTrainer(firstTrainer)
    const connect2 = session.connectTrainer(secondTrainer)

    await connect2
    firstTrainer.finishConnect()
    await connect1

    // First trainer should have been disconnected
    expect(firstDisconnect).toHaveBeenCalled()
    // Second trainer should be connected
    expect(session.getState().trainerConnected).toBe(true)
  })

  it("dispose stops timers and disconnects trainer", async () => {
    const session = createRideSession()
    const trainer = new TestTrainer()
    const disconnect = vi.spyOn(trainer, "disconnect")
    await session.connectTrainer(trainer)

    await session.dispose()

    expect(disconnect).toHaveBeenCalled()
    expect(session.getState().trainerConnected).toBe(false)
  })

  it("throws when connecting to disposed session", async () => {
    const session = createRideSession()
    await session.dispose()

    await expect(
      session.connectTrainer(new TestTrainer())
    ).rejects.toThrow("Session disposed")
  })
})
