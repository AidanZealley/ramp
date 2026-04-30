import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Capability } from "@ramp/ride-contracts"
import { MockTrainer } from "./mock-trainer"

describe("MockTrainer", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("emits telemetry and stops after disconnect", async () => {
    const trainer = new MockTrainer({ intervalMs: 1000 })
    const listener = vi.fn()
    trainer.subscribeTelemetry(listener)

    await trainer.connect()
    await trainer.disconnect()
    vi.advanceTimersByTime(3000)

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("keeps state authoritative through connect and disconnect", async () => {
    const trainer = new MockTrainer()
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

  it("makes connecting state observable before connected", async () => {
    const trainer = new MockTrainer()
    const listener = vi.fn()
    trainer.subscribeState(listener)

    const connect = trainer.connect()

    expect(listener).toHaveBeenCalledWith({ kind: "connecting" })
    expect(listener).not.toHaveBeenCalledWith({ kind: "connected" })

    await connect
    expect(listener).toHaveBeenCalledWith({ kind: "connected" })
  })

  it("does not publish connected after disconnect during delayed connect", async () => {
    const trainer = new MockTrainer({ connectDelayMs: 1000 })
    const listener = vi.fn()
    trainer.subscribeState(listener)

    const connect = trainer.connect()
    await trainer.disconnect()
    vi.advanceTimersByTime(1000)
    await connect

    expect(trainer.state.kind).toBe("disconnected")
    expect(listener).not.toHaveBeenCalledWith({ kind: "connected" })
  })

  it("reflects target power in telemetry", async () => {
    const trainer = new MockTrainer()
    const listener = vi.fn()
    trainer.subscribeTelemetry(listener)
    await trainer.connect()
    await trainer.sendCommand({ type: "setTargetPower", watts: 240 })

    vi.advanceTimersByTime(100)

    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ powerWatts: 240 })
    )
  })

  it("applies manual override telemetry for simulator controls", async () => {
    const trainer = new MockTrainer()
    const listener = vi.fn()
    trainer.subscribeTelemetry(listener)
    await trainer.connect()

    trainer.setManualOverrides({ powerWatts: 205, cadenceRpm: 88 })

    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ powerWatts: 205, cadenceRpm: 88 })
    )
  })

  it("rejects unsupported commands", async () => {
    const trainer = new MockTrainer({
      capabilities: new Set([Capability.ReadPower]),
    })

    await expect(
      trainer.sendCommand({ type: "setTargetPower", watts: 200 })
    ).rejects.toMatchObject({ code: "command-rejected" })
  })
})
