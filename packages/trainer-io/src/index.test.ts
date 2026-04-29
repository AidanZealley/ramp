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

  it("rejects unsupported commands", async () => {
    const trainer = new MockTrainer({
      capabilities: new Set([Capability.ReadPower]),
    })

    await expect(
      trainer.sendCommand({ type: "setTargetPower", watts: 200 })
    ).rejects.toMatchObject({ code: "command-rejected" })
  })
})
