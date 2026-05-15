import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Capability } from "@ramp/ride-contracts"
import { SimulatedTrainer } from "./simulated-trainer"

describe("SimulatedTrainer", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("connects, emits telemetry, and stops after disconnect", async () => {
    const trainer = new SimulatedTrainer({ intervalMs: 1000 })
    const listener = vi.fn()
    trainer.subscribeTelemetry(listener)

    await trainer.connect()
    await trainer.disconnect()
    vi.advanceTimersByTime(3000)

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("starts a fresh connect after disconnect invalidates an in-flight connect", async () => {
    const trainer = new SimulatedTrainer({
      connectDelayMs: 10,
      intervalMs: 1000,
    })
    const listener = vi.fn()
    trainer.subscribeTelemetry(listener)

    const first = trainer.connect()
    await trainer.disconnect()
    const second = trainer.connect()

    await vi.advanceTimersByTimeAsync(10)
    await first
    await second

    expect(trainer.state.kind).toBe("connected")
    expect(trainer.simulator.connected).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1000)

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it("coalesces repeated connect calls during one valid attempt", async () => {
    const trainer = new SimulatedTrainer({
      connectDelayMs: 10,
      intervalMs: 1000,
    })
    const states: Array<string> = []
    trainer.subscribeState((state) => states.push(state.kind))

    const first = trainer.connect()
    const second = trainer.connect()

    expect(second).toBe(first)

    await vi.advanceTimersByTimeAsync(10)
    await first

    expect(trainer.state.kind).toBe("connected")
    expect(states).toEqual(["connecting", "connected"])
  })

  it("keeps state transitions observable", async () => {
    const trainer = new SimulatedTrainer()
    const states: Array<string> = []
    trainer.subscribeState((state) => states.push(state.kind))

    const connect = trainer.connect()
    expect(trainer.state.kind).toBe("connecting")
    await connect
    expect(trainer.state.kind).toBe("connected")

    await trainer.disconnect()
    expect(trainer.state.kind).toBe("disconnected")
    expect(states).toEqual(["connecting", "connected", "disconnected"])
  })

  it("updates target power and ramps rider power in ERG auto", async () => {
    const trainer = new SimulatedTrainer({ intervalMs: 1000 })
    const telemetry = vi.fn()
    trainer.subscribeTelemetry(telemetry)
    await trainer.connect()

    await trainer.sendCommand({ type: "setMode", mode: "erg" })
    await trainer.sendCommand({ type: "setTargetPower", watts: 300 })
    vi.advanceTimersByTime(2000)

    expect(trainer.simulator.targetPowerWatts).toBe(300)
    expect(trainer.rider.state.powerMode).toBe("erg-auto")
    expect(telemetry).toHaveBeenLastCalledWith(
      expect.objectContaining({ powerWatts: 300 })
    )
  })

  it("manual power changes switch the rider to manual mode", async () => {
    const trainer = new SimulatedTrainer()
    await trainer.connect()
    await trainer.sendCommand({ type: "setMode", mode: "erg" })

    trainer.rider.dispatch({ type: "setManualPower", watts: 225 })

    expect(trainer.rider.state.powerMode).toBe("manual")
    expect(trainer.rider.state.powerWatts).toBe(225)
  })

  it("cadence changes are reflected in telemetry", async () => {
    const trainer = new SimulatedTrainer({ intervalMs: 1000 })
    const telemetry = vi.fn()
    trainer.subscribeTelemetry(telemetry)
    await trainer.connect()

    trainer.rider.dispatch({ type: "setCadence", rpm: 97 })
    vi.advanceTimersByTime(1000)

    expect(telemetry).toHaveBeenLastCalledWith(
      expect.objectContaining({ cadenceRpm: 97 })
    )
  })

  it("simulation grade affects speed", async () => {
    const trainer = new SimulatedTrainer({ intervalMs: 1000 })
    const speeds: Array<number> = []
    trainer.subscribeTelemetry((telemetry) =>
      speeds.push(telemetry.speedMps ?? 0)
    )
    await trainer.connect()
    vi.advanceTimersByTime(1000)

    await trainer.sendCommand({ type: "setSimulationGrade", gradePercent: 10 })
    vi.advanceTimersByTime(1000)

    expect(speeds.at(-1)).toBeLessThan(speeds[1] ?? Number.POSITIVE_INFINITY)
  })

  it("resistance command updates state", async () => {
    const trainer = new SimulatedTrainer()
    await trainer.connect()

    await trainer.sendCommand({ type: "setResistance", level: 42 })

    expect(trainer.simulator.resistanceLevel).toBe(42)
  })

  it("rejects invalid commands before mutating state", async () => {
    const trainer = new SimulatedTrainer()
    await trainer.connect()

    await expect(
      trainer.sendCommand({ type: "setTargetPower", watts: -1 })
    ).rejects.toMatchObject({ code: "validation" })
    expect(trainer.simulator.targetPowerWatts).toBeNull()
  })

  it("rejects unsupported capabilities", async () => {
    const trainer = new SimulatedTrainer({
      capabilities: new Set([Capability.ReadPower]),
    })
    await trainer.connect()

    await expect(
      trainer.sendCommand({ type: "setTargetPower", watts: 200 })
    ).rejects.toMatchObject({ code: "command-rejected" })
  })

  it("emits zero power and speed while paused", async () => {
    const trainer = new SimulatedTrainer({ intervalMs: 1000 })
    const telemetry = vi.fn()
    trainer.subscribeTelemetry(telemetry)
    await trainer.connect()

    trainer.rider.dispatch({ type: "setPaused", paused: true })
    vi.advanceTimersByTime(1000)

    expect(telemetry).toHaveBeenLastCalledWith(
      expect.objectContaining({ powerWatts: 0, speedMps: 0, cadenceRpm: 85 })
    )
  })
})
