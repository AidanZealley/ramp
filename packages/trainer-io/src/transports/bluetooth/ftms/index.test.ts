import { Capability } from "@ramp/ride-contracts"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FtmsBleTrainer } from "./index"
import type { TrainerTelemetryMessage } from "../../../types"
import type { BleTrainerDeviceInfo } from "./device-info"

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
      connectionFactory: () =>
        Promise.resolve({
          capabilities: new Set([Capability.TargetPower]),
          release: () => Promise.resolve(undefined),
          disconnect: () => Promise.resolve(undefined),
          sendCommand: () => Promise.resolve(undefined),
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
      connectionFactory: () => Promise.reject(new Error("boom")),
    })

    trainer.subscribeError((error) => errors.push(error.code))

    await expect(trainer.connect()).rejects.toMatchObject({ code: "transport" })
    expect(trainer.state.kind).toBe("error")
    expect(errors).toEqual(["transport"])
  })

  it("treats disconnect during connect as supersession, not an error", async () => {
    let rejectConnect!: (error: unknown) => void
    const errors: Array<string> = []
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: () =>
        new Promise((_, reject) => {
          rejectConnect = reject
        }),
    })

    trainer.subscribeError((error) => errors.push(error.code))

    const connect = trainer.connect()
    await trainer.disconnect()
    rejectConnect(new Error("stale failure"))
    await connect

    expect(trainer.state.kind).toBe("disconnected")
    expect(errors).toEqual([])
  })

  it("rejects trainer commands when capabilities are absent", async () => {
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: () =>
        Promise.resolve({
          capabilities: new Set(),
          release: () => Promise.resolve(undefined),
          disconnect: () => Promise.resolve(undefined),
          sendCommand: () => Promise.resolve(undefined),
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
      connectionFactory: () =>
        Promise.resolve({
          capabilities: new Set([Capability.TargetPower]),
          release: () => Promise.resolve(undefined),
          disconnect: () => Promise.resolve(undefined),
          sendCommand: () => {
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
    const release = vi.fn(() => Promise.resolve(undefined))
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: () =>
        Promise.resolve({
          capabilities: new Set([Capability.TargetPower, Capability.Resistance]),
          release,
          disconnect: () => Promise.resolve(undefined),
          sendCommand: () => Promise.resolve(undefined),
        }),
    })

    await trainer.connect()
    await trainer.sendCommand({ type: "setMode", mode: "free" })

    expect(release).toHaveBeenCalledTimes(1)
  })

  it("keeps the previous mode when setMode free fails", async () => {
    const sendCommand = vi.fn(() => Promise.resolve(undefined))
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: () =>
        Promise.resolve({
          capabilities: new Set([Capability.TargetPower, Capability.Resistance]),
          release: vi.fn(() => Promise.reject(new Error("release failed"))),
          disconnect: () => Promise.resolve(undefined),
          sendCommand,
        }),
    })

    await trainer.connect()
    await trainer.sendCommand({ type: "setMode", mode: "erg" })
    await expect(
      trainer.sendCommand({ type: "setMode", mode: "free" })
    ).rejects.toMatchObject({ code: "transport" })

    await trainer.sendCommand({ type: "setTargetPower", watts: 200 })
    expect(sendCommand).toHaveBeenCalledWith({
      type: "setTargetPower",
      watts: 200,
    })
  })

  // C1: mode routing
  it("rejects setTargetPower in simulation mode", async () => {
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: () =>
        Promise.resolve({
          capabilities: new Set([
            Capability.TargetPower,
            Capability.SimulationGrade,
          ]),
          release: () => Promise.resolve(undefined),
          disconnect: () => Promise.resolve(undefined),
          sendCommand: () => Promise.resolve(undefined),
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
      connectionFactory: () =>
        Promise.resolve({
          capabilities: new Set([
            Capability.TargetPower,
            Capability.SimulationGrade,
          ]),
          release: () => Promise.resolve(undefined),
          disconnect: () => Promise.resolve(undefined),
          sendCommand: () => Promise.resolve(undefined),
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
      connectionFactory: () =>
        Promise.resolve({
          capabilities: new Set([
            Capability.TargetPower,
            Capability.Resistance,
            Capability.SimulationGrade,
          ]),
          release: () => Promise.resolve(undefined),
          disconnect: () => Promise.resolve(undefined),
          sendCommand: () => Promise.resolve(undefined),
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
    const sendCommand = vi.fn(() => Promise.resolve(undefined))
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: () =>
        Promise.resolve({
          capabilities: new Set([Capability.TargetPower]),
          release: () => Promise.resolve(undefined),
          disconnect: () => Promise.resolve(undefined),
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
    const release = vi.fn(() => Promise.resolve(undefined))
    const disconnect = vi.fn(() => Promise.resolve(undefined))
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: () =>
        Promise.resolve({
          capabilities: new Set([Capability.TargetPower]),
          release,
          disconnect,
          sendCommand: () => Promise.resolve(undefined),
        }),
    })

    await trainer.connect()
    await trainer.disconnect()

    // connection.disconnect is called (which internally handles release)
    expect(disconnect).toHaveBeenCalledTimes(1)
    // the class-level disconnect should NOT call release separately
    expect(release).not.toHaveBeenCalled()
  })

  it("returns an isolated capabilities view", async () => {
    let emitTelemetry:
      | ((t: TrainerTelemetryMessage) => void)
      | null = null
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: ({ onTelemetry }) => {
        emitTelemetry = onTelemetry
        return Promise.resolve({
          capabilities: new Set<Capability>(),
          release: () => Promise.resolve(undefined),
          disconnect: () => Promise.resolve(undefined),
          sendCommand: () => Promise.resolve(undefined),
        })
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
    const caps = trainer.capabilities
    ;(caps as Set<Capability>).add(Capability.TargetPower)

    expect(trainer.capabilities.has(Capability.TargetPower)).toBe(false)
    expect(caps.size).toBe(4)
  })

  // H1: unexpected disconnect emits error state only
  it("unexpected disconnect emits error without immediate disconnected transition", async () => {
    let triggerDisconnect: (() => void) | null = null
    const states: Array<string> = []
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: ({ onDisconnected }) => {
        triggerDisconnect = onDisconnected
        return Promise.resolve({
          capabilities: new Set([Capability.TargetPower]),
          release: () => Promise.resolve(undefined),
          disconnect: () => Promise.resolve(undefined),
          sendCommand: () => Promise.resolve(undefined),
        })
      },
    })

    trainer.subscribeState((state) => states.push(state.kind))
    await trainer.connect()

    states.length = 0
    triggerDisconnect!()

    // Should emit only error, not error then disconnected
    expect(states).toEqual(["error"])
  })

  it("resets connection-scoped state on disconnect", async () => {
    let emitTelemetry!: (
      t: TrainerTelemetryMessage
    ) => void
    let setDeviceInfo!: (
      deviceInfo: BleTrainerDeviceInfo
    ) => void
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: ({ onTelemetry, onDeviceInfo }) => {
        emitTelemetry = onTelemetry
        setDeviceInfo = onDeviceInfo
        return Promise.resolve({
          capabilities: new Set([Capability.TargetPower]),
          release: () => Promise.resolve(undefined),
          disconnect: () => Promise.resolve(undefined),
          sendCommand: () => Promise.resolve(undefined),
        })
      },
    })

    await trainer.connect()
    await trainer.sendCommand({ type: "setMode", mode: "erg" })
    emitTelemetry({
      powerWatts: 220,
      cadenceRpm: 90,
      speedMps: 8,
      heartRateBpm: 150,
      timestampMs: 1000,
      source: "ftms-ble",
    })
    setDeviceInfo({
      id: "trainer-1",
      name: "KICKR CORE",
      manufacturer: "Wahoo",
      modelNumber: "CORE",
      firmwareRevision: "1.0.0",
      isKickr: true,
    })

    await trainer.disconnect()

    expect(Array.from(trainer.capabilities)).toEqual([])
    expect(trainer.deviceInfo).toMatchObject({
      id: "trainer-1",
      name: "KICKR CORE",
      manufacturer: null,
      modelNumber: null,
      firmwareRevision: null,
      isKickr: true,
    })
    await expect(
      trainer.sendCommand({ type: "setTargetPower", watts: 200 })
    ).rejects.toMatchObject({ code: "command-rejected" })
  })

  // H4: double connect returns same promise
  it("second connect() returns same promise as first", async () => {
    const trainer = new FtmsBleTrainer({
      device: createDevice(),
      connectionFactory: () =>
        Promise.resolve({
          capabilities: new Set([Capability.TargetPower]),
          release: () => Promise.resolve(undefined),
          disconnect: () => Promise.resolve(undefined),
          sendCommand: () => Promise.resolve(undefined),
        }),
    })

    const first = trainer.connect()
    const second = trainer.connect()

    expect(second).toBe(first)
    await first
    expect(trainer.state.kind).toBe("connected")
  })
})
