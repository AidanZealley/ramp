// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  Capability,
  type RideTrainerAdapter,
  type TrainerCommand as PublicTrainerCommand,
} from "./index"
import { createRideSession } from "./controller"
import type {
  RideTrainerConnectionState,
  RideTrainerError,
  RideTrainerTelemetry,
} from "./types"
import { useRideSession } from "./use-ride-session"

class TestTrainer implements RideTrainerAdapter {
  readonly capabilities: RideTrainerAdapter["capabilities"]
  private telemetryListener: ((t: RideTrainerTelemetry) => void) | null = null
  private stateListener: ((s: RideTrainerConnectionState) => void) | null = null
  private errorListener: ((e: RideTrainerError) => void) | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private targetWatts: number | null = null

  constructor(capabilities = new Set(Object.values(Capability))) {
    this.capabilities = capabilities
  }

  async connect(): Promise<void> {
    this.stateListener?.({ kind: "connecting" })
    this.stateListener?.({ kind: "connected" })
    this.telemetryListener?.(this.telemetry())
    this.timer = setInterval(() => {
      this.telemetryListener?.(this.telemetry())
    }, 100)
  }

  async disconnect(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.stateListener?.({ kind: "disconnected" })
  }

  async sendCommand(command: PublicTrainerCommand): Promise<void> {
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
  private telemetry(): RideTrainerTelemetry {
    return {
      powerWatts: this.targetWatts ?? 180,
      cadenceRpm: 90,
      speedMps: 8,
      heartRateBpm: null,
    }
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

  it("connects a trainer and updates idle state", async () => {
    const session = createRideSession()
    await session.connectTrainer(new TestTrainer())

    expect(session.getState().trainerConnected).toBe(true)
  })

  it("rejects unsupported capabilities", async () => {
    const session = createRideSession()
    await session.connectTrainer(
      new TestTrainer(new Set([Capability.ReadPower]))
    )

    await expect(
      session.controls.dispatch({ type: "setTargetPower", watts: 200 }, "user")
    ).resolves.toEqual({ ok: false, reason: "capability-unsupported" })
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

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(sendCommand).toHaveBeenCalledWith({
      type: "setSimulationGrade",
      gradePercent: 4,
    })
  })

  it("notifies the React hook after telemetry ticks", async () => {
    const session = createRideSession()
    await session.connectTrainer(new TestTrainer())
    const { result } = renderHook(() => useRideSession(session))

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.telemetry.elapsedSeconds).toBeGreaterThan(0)
  })

  it("re-exports trainer contracts through the public API", () => {
    const command: PublicTrainerCommand = { type: "setTargetPower", watts: 215 }

    expect(Capability.TargetPower).toBe("write.targetPower")
    expect(command.type).toBe("setTargetPower")
  })
})
