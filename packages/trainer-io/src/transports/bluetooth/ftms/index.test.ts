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
})
