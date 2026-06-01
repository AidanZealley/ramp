import { describe, expect, it } from "vitest"
import {
  RAMP_TEST_INTERVALS,
  getCooldownStartSeconds,
  getRampPhaseAtElapsed,
  getRampStartSeconds,
  getRampTestDefinition,
  getRampTestTotalDurationSeconds,
} from "./ramp-protocol"

describe("ramp protocol", () => {
  it("ramps from 100 W to 640 W in +20 W steps", () => {
    const rampWatts = RAMP_TEST_INTERVALS.filter(
      (interval) => interval.durationSeconds === 60
    ).map((interval) => interval.startPower)
    expect(rampWatts[0]).toBe(100)
    expect(rampWatts.at(-1)).toBe(640)
    expect(rampWatts).toHaveLength(28)
  })

  it("places phase boundaries at the warmup/ramp/cooldown edges", () => {
    expect(getRampStartSeconds()).toBe(180)
    expect(getCooldownStartSeconds()).toBe(180 + 28 * 60)
  })

  it("derives the phase from elapsed time", () => {
    expect(getRampPhaseAtElapsed(0)).toBe("warmup")
    expect(getRampPhaseAtElapsed(getRampStartSeconds() - 1)).toBe("warmup")
    expect(getRampPhaseAtElapsed(getRampStartSeconds())).toBe("ramp")
    expect(getRampPhaseAtElapsed(getCooldownStartSeconds() - 1)).toBe("ramp")
    expect(getRampPhaseAtElapsed(getCooldownStartSeconds())).toBe("cooldown")
  })

  it("builds an absolute-watt workout definition", () => {
    const definition = getRampTestDefinition()
    expect(definition.powerMode).toBe("absolute")
    expect(definition.intervals.length).toBe(RAMP_TEST_INTERVALS.length)
    expect(getRampTestTotalDurationSeconds()).toBe(180 + 28 * 60 + 600)
  })
})
