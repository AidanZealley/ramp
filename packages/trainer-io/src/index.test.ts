import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MockTrainerSource } from "./index"

describe("MockTrainerSource", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("emits normalized telemetry", async () => {
    const source = new MockTrainerSource({
      initialTelemetry: { powerWatts: 220, cadenceRpm: 96, speedMps: 9 },
    })
    const listener = vi.fn()
    source.subscribe(listener)

    await source.connect()

    expect(listener).toHaveBeenCalledWith({
      powerWatts: 220,
      cadenceRpm: 96,
      speedMps: 9,
      timestampMs: 1000,
      source: "simulator",
    })
  })

  it("allows subscribers to unsubscribe", async () => {
    const source = new MockTrainerSource()
    const listener = vi.fn()
    const unsubscribe = source.subscribe(listener)

    unsubscribe()
    await source.connect()

    expect(listener).not.toHaveBeenCalled()
  })

  it("stops emissions after disconnect", async () => {
    const source = new MockTrainerSource({ intervalMs: 1000 })
    const listener = vi.fn()
    source.subscribe(listener)
    await source.connect()
    await source.disconnect()

    vi.advanceTimersByTime(3000)

    expect(listener).toHaveBeenCalledTimes(1)
  })
})
