import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Capability } from "@ramp/ride-contracts"
import { CommandArbiter } from "./arbiter"
import { defaultPolicy } from "./policy"
import type { RideTrainerAdapter, TrainerCommand } from "./types"

function createTrainerAdapterHarness() {
  const commands: Array<TrainerCommand> = []
  const sendCommand = vi.fn((command: TrainerCommand) => {
    commands.push(command)
    return Promise.resolve()
  })
  const adapter: RideTrainerAdapter = {
    capabilities: new Set(Object.values(Capability)),
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    sendCommand,
    subscribeTelemetry: () => () => undefined,
    subscribeState: () => () => undefined,
    subscribeError: () => () => undefined,
  }
  return { adapter, commands, sendCommand }
}

describe("CommandArbiter", () => {
  let nowMs = 0

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, "random").mockReturnValue(0)
    nowMs = 0
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  const createArbiter = () => new CommandArbiter(defaultPolicy, () => nowMs)

  it("coalesces commands by command key", async () => {
    const arbiter = createArbiter()
    const { adapter, commands } = createTrainerAdapterHarness()

    arbiter.enqueue({ type: "setTargetPower", watts: 200 }, "experience", {
      priority: "immediate",
    })
    arbiter.enqueue({ type: "setTargetPower", watts: 215 }, "experience", {
      priority: "immediate",
    })

    await arbiter.flush(adapter)

    expect(commands).toEqual([{ type: "setTargetPower", watts: 215 }])
  })

  it("honors source precedence and immediate priority", async () => {
    const arbiter = createArbiter()
    const { adapter, commands } = createTrainerAdapterHarness()

    arbiter.enqueue({ type: "setSimulationGrade", gradePercent: 4 }, "user")
    arbiter.enqueue({ type: "setResistance", level: 8 }, "experience", {
      priority: "immediate",
    })
    await arbiter.flush(adapter)
    await arbiter.flush(adapter)

    expect(commands).toEqual([
      { type: "setResistance", level: 8 },
    ])
  })

  it("serializes in-flight sends", async () => {
    const arbiter = createArbiter()
    let release!: () => void
    const { adapter, sendCommand } = createTrainerAdapterHarness()
    sendCommand.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        })
    )
    arbiter.enqueue({ type: "setTargetPower", watts: 200 }, "user", {
      priority: "immediate",
    })
    arbiter.enqueue({ type: "setResistance", level: 10 }, "user", {
      priority: "immediate",
    })

    const firstFlush = arbiter.flush(adapter)
    await Promise.resolve()
    await expect(arbiter.flush(adapter)).resolves.toEqual({ sent: false })
    release()
    await firstFlush
    const secondFlush = arbiter.flush(adapter)
    await Promise.resolve()
    release()
    await secondFlush

    expect(sendCommand).toHaveBeenCalledTimes(2)
  })

  it("retries with deterministic backoff and rejects after max retry", async () => {
    const arbiter = createArbiter()
    const { adapter, sendCommand } = createTrainerAdapterHarness()
    sendCommand.mockRejectedValue(new Error("nope"))

    const completion = arbiter.enqueue(
      { type: "setTargetPower", watts: 200 },
      "user",
      { priority: "immediate", delivery: "acknowledged" }
    )

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await expect(arbiter.flush(adapter)).rejects.toThrow("nope")
      nowMs += 2_000
    }

    await expect(completion).rejects.toThrow("nope")
    expect(sendCommand).toHaveBeenCalledTimes(6)
  })

  it("rejects acknowledged delivery on supersession and clear", async () => {
    const arbiter = createArbiter()
    const superseded = arbiter.enqueue(
      { type: "setTargetPower", watts: 200 },
      "experience",
      { delivery: "acknowledged" }
    )
    arbiter.enqueue({ type: "setTargetPower", watts: 205 }, "user")

    await expect(superseded).rejects.toThrow("command-superseded")

    const cleared = arbiter.enqueue(
      { type: "setResistance", level: 10 },
      "user",
      { delivery: "acknowledged" }
    )
    arbiter.clear({ reason: "test-clear" })

    await expect(cleared).rejects.toThrow("test-clear")
  })

  it("clears last sent timestamps when requested", async () => {
    const arbiter = createArbiter()
    const { adapter, commands } = createTrainerAdapterHarness()
    arbiter.enqueue({ type: "setTargetPower", watts: 200 }, "user", {
      priority: "immediate",
    })
    await arbiter.flush(adapter)

    arbiter.enqueue({ type: "setTargetPower", watts: 205 }, "user")
    await expect(arbiter.flush(adapter)).resolves.toEqual({ sent: false })
    arbiter.clear({ clearLastSent: true })
    arbiter.enqueue({ type: "setTargetPower", watts: 210 }, "user", {
      priority: "immediate",
    })
    await arbiter.flush(adapter)

    expect(commands).toEqual([
      { type: "setTargetPower", watts: 200 },
      { type: "setTargetPower", watts: 210 },
    ])
  })
})
