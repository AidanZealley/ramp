import { Capability } from "@ramp/ride-contracts"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FtmsBleTrainer } from "./index"

function createDevice(): BluetoothDevice {
  return {
    id: "trainer-1",
    name: "KICKR CORE",
  } as BluetoothDevice
}

describe("FtmsBleTrainer", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it("transitions through connecting to connected on success", async () => {
    const states: Array<string> = []
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: async () => ({
        capabilities: new Set([Capability.TargetPower]),
        release: async () => undefined,
        disconnect: async () => undefined,
        sendCommand: async () => undefined,
      }),
    })

    trainer.subscribeState((state) => states.push(state.kind))
    await trainer.connect()

    expect(trainer.state.kind).toBe("connected")
    expect(states).toEqual(["connecting", "connected"])
  })

  it("moves to error and emits the mapped trainer error on connect failure", async () => {
    const errors: Array<string> = []
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: async () => {
        throw new Error("boom")
      },
    })

    trainer.subscribeError((error) => errors.push(error.code))

    await expect(trainer.connect()).rejects.toMatchObject({ code: "transport" })
    expect(trainer.state.kind).toBe("error")
    expect(errors).toEqual(["transport"])
  })

  it("rejects trainer commands when capabilities are absent", async () => {
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: async () => ({
        capabilities: new Set(),
        release: async () => undefined,
        disconnect: async () => undefined,
        sendCommand: async () => undefined,
      }),
    })

    await trainer.connect()
    await expect(
      trainer.sendCommand({ type: "setTargetPower", watts: 250 })
    ).rejects.toMatchObject({ code: "command-rejected" })
  })

  it("maps control response timeouts through sendCommand", async () => {
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: async () => ({
        capabilities: new Set([Capability.TargetPower]),
        release: async () => undefined,
        disconnect: async () => undefined,
        sendCommand: async () => {
          throw { code: "timeout", message: "late" }
        },
      }),
    })

    await trainer.connect()
    await trainer.sendCommand({ type: "setMode", mode: "erg" })
    await expect(
      trainer.sendCommand({ type: "setTargetPower", watts: 250 })
    ).rejects.toMatchObject({ code: "timeout" })
  })

  it("releases to resistance zero on free mode when supported", async () => {
    const release = vi.fn(async () => undefined)
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: async () => ({
        capabilities: new Set([Capability.TargetPower, Capability.Resistance]),
        release,
        disconnect: async () => undefined,
        sendCommand: async () => undefined,
      }),
    })

    await trainer.connect()
    await trainer.sendCommand({ type: "setMode", mode: "free" })

    expect(release).toHaveBeenCalledTimes(1)
  })

  // C1: mode routing
  it("rejects setTargetPower in simulation mode", async () => {
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: async () => ({
        capabilities: new Set([
          Capability.TargetPower,
          Capability.SimulationGrade,
        ]),
        release: async () => undefined,
        disconnect: async () => undefined,
        sendCommand: async () => undefined,
      }),
    })

    await trainer.connect()
    await trainer.sendCommand({ type: "setMode", mode: "simulation" })
    await expect(
      trainer.sendCommand({ type: "setTargetPower", watts: 200 })
    ).rejects.toMatchObject({ code: "command-rejected" })
  })

  it("rejects setSimulationGrade in erg mode", async () => {
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: async () => ({
        capabilities: new Set([
          Capability.TargetPower,
          Capability.SimulationGrade,
        ]),
        release: async () => undefined,
        disconnect: async () => undefined,
        sendCommand: async () => undefined,
      }),
    })

    await trainer.connect()
    await trainer.sendCommand({ type: "setMode", mode: "erg" })
    await expect(
      trainer.sendCommand({
        type: "setSimulationGrade",
        gradePercent: 5,
      })
    ).rejects.toMatchObject({ code: "command-rejected" })
  })

  it("rejects all power/resistance/simulation commands in free mode", async () => {
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: async () => ({
        capabilities: new Set([
          Capability.TargetPower,
          Capability.Resistance,
          Capability.SimulationGrade,
        ]),
        release: async () => undefined,
        disconnect: async () => undefined,
        sendCommand: async () => undefined,
      }),
    })

    await trainer.connect()
    // mode defaults to "free"
    await expect(
      trainer.sendCommand({ type: "setTargetPower", watts: 200 })
    ).rejects.toMatchObject({ code: "command-rejected" })
    await expect(
      trainer.sendCommand({ type: "setResistance", level: 50 })
    ).rejects.toMatchObject({ code: "command-rejected" })
    await expect(
      trainer.sendCommand({ type: "setSimulationGrade", gradePercent: 5 })
    ).rejects.toMatchObject({ code: "command-rejected" })
  })

  it("allows setTargetPower in erg mode", async () => {
    const sendCommand = vi.fn(async () => undefined)
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: async () => ({
        capabilities: new Set([Capability.TargetPower]),
        release: async () => undefined,
        disconnect: async () => undefined,
        sendCommand,
      }),
    })

    await trainer.connect()
    await trainer.sendCommand({ type: "setMode", mode: "erg" })
    await trainer.sendCommand({ type: "setTargetPower", watts: 200 })

    expect(sendCommand).toHaveBeenCalledWith({
      type: "setTargetPower",
      watts: 200,
    })
  })

  // C2: disconnect calls release exactly once (via connection.disconnect)
  it("disconnect does not call release() separately", async () => {
    const release = vi.fn(async () => undefined)
    const disconnect = vi.fn(async () => undefined)
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: async () => ({
        capabilities: new Set([Capability.TargetPower]),
        release,
        disconnect,
        sendCommand: async () => undefined,
      }),
    })

    await trainer.connect()
    await trainer.disconnect()

    // connection.disconnect is called (which internally handles release)
    expect(disconnect).toHaveBeenCalledTimes(1)
    // the class-level disconnect should NOT call release separately
    expect(release).not.toHaveBeenCalled()
  })

  // C3: capabilities set stability
  it("mergeReadCapabilities returns same Set when nothing changed", async () => {
    let emitTelemetry: ((t: import("../../../types").TrainerTelemetryMessage) => void) | null = null
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: async ({ onTelemetry }) => {
        emitTelemetry = onTelemetry
        return {
          capabilities: new Set<Capability>(),
          release: async () => undefined,
          disconnect: async () => undefined,
          sendCommand: async () => undefined,
        }
      },
    })

    await trainer.connect()

    // First tick — adds read capabilities
    emitTelemetry!({
      powerWatts: 200,
      cadenceRpm: 90,
      speedMps: 8,
      heartRateBpm: null,
      timestampMs: 1000,
      source: "ftms-ble",
    })
    const capsAfterFirst = trainer.capabilities

    // Second tick with same fields — should return same Set reference
    emitTelemetry!({
      powerWatts: 210,
      cadenceRpm: 91,
      speedMps: 8.1,
      heartRateBpm: null,
      timestampMs: 1100,
      source: "ftms-ble",
    })

    expect(trainer.capabilities).toBe(capsAfterFirst)
    expect(capsAfterFirst.size).toBe(3) // power, cadence, speed
  })

  // H1: unexpected disconnect emits error state only
  it("unexpected disconnect emits error without immediate disconnected transition", async () => {
    let triggerDisconnect: (() => void) | null = null
    const states: Array<string> = []
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: async ({ onDisconnected }) => {
        triggerDisconnect = onDisconnected
        return {
          capabilities: new Set([Capability.TargetPower]),
          release: async () => undefined,
          disconnect: async () => undefined,
          sendCommand: async () => undefined,
        }
      },
    })

    trainer.subscribeState((state) => states.push(state.kind))
    await trainer.connect()

    states.length = 0
    triggerDisconnect!()

    // Should emit only error, not error then disconnected
    expect(states).toEqual(["error"])
  })

  // H4: double connect returns same promise
  it("second connect() returns same promise as first", async () => {
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: async () => ({
        capabilities: new Set([Capability.TargetPower]),
        release: async () => undefined,
        disconnect: async () => undefined,
        sendCommand: async () => undefined,
      }),
    })

    const first = trainer.connect()
    const second = trainer.connect()

    expect(second).toBe(first)
    await first
    expect(trainer.state.kind).toBe("connected")
  })
})
