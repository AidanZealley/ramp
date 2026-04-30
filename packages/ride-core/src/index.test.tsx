// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createRideSession } from "./controller"
import { useRideSession } from "./use-ride-session"
import {
  Capability
  
  
} from "./index"
import type {TrainerCommand as PublicTrainerCommand, RideTrainerAdapter} from "./index";
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

  constructor(capabilities = new Set(Object.values(Capability))) {
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

  it("retries a pending command after a send failure", async () => {
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

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })

    expect(sendCommand).toHaveBeenCalledTimes(2)
  })

  it("continues flushing other command keys when one send fails", async () => {
    const trainer = new TestTrainer()
    const sendCommand = vi.spyOn(trainer, "sendCommand")
    sendCommand.mockImplementation((command) => {
      if (command.type === "setTargetPower") {
        return Promise.reject(new Error("target failed"))
      }
      return Promise.resolve()
    })
    const session = createRideSession()
    await session.connectTrainer(trainer)

    await session.controls.dispatch(
      { type: "setTargetPower", watts: 225 },
      "user",
      { priority: "immediate" }
    )
    await session.controls.dispatch(
      { type: "setSimulationGrade", gradePercent: 4 },
      "experience",
      { priority: "immediate" }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })

    expect(sendCommand).toHaveBeenCalledWith({
      type: "setSimulationGrade",
      gradePercent: 4,
    })
  })

  it("does not overlap sends for the same command key", async () => {
    const trainer = new TestTrainer()
    let resolveSend: () => void = () => undefined
    const sendCommand = vi.spyOn(trainer, "sendCommand").mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve
        })
    )
    const session = createRideSession()
    await session.connectTrainer(trainer)

    await session.controls.dispatch(
      { type: "setTargetPower", watts: 225 },
      "user",
      { priority: "immediate" }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(sendCommand).toHaveBeenCalledTimes(1)

    resolveSend()
    await act(async () => {
      await Promise.resolve()
    })
  })

  it("sends immediate commands without waiting for the first coalesce window", async () => {
    const trainer = new TestTrainer()
    const sendCommand = vi.spyOn(trainer, "sendCommand")
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

    expect(sendCommand).toHaveBeenCalledWith({
      type: "setTargetPower",
      watts: 225,
    })
  })

  it("does not notify telemetry subscribers when the snapshot is unchanged", async () => {
    const session = createRideSession({ now: () => 0 })
    await session.connectTrainer(new TestTrainer())
    act(() => {
      vi.advanceTimersByTime(100)
    })
    const listener = vi.fn()
    session.subscribe(listener)

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(listener).not.toHaveBeenCalled()
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
