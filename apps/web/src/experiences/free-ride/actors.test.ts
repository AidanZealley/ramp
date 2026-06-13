import { describe, expect, it } from "vitest"
import { FREE_RIDE_TARGETS } from "./free-ride-config"
import { getRacingLineOffset } from "./track"
import {
  getDroneCruisePowerWatts,
  getNextTargetDroneGapMeters,
  getTargetDroneActor,
  getTargetDroneRelativeSpeedMps,
} from "./actors"

describe("getTargetDroneActor", () => {
  it("places the default target exactly 100m ahead", () => {
    const actor = getTargetDroneActor({ riderDistanceMeters: 250 })

    expect(actor.leadMeters).toBe(FREE_RIDE_TARGETS.defaultLeadMeters)
    expect(actor.distance).toBe(350)
    expect(actor.gapMeters).toBe(FREE_RIDE_TARGETS.defaultLeadMeters)
  })

  it("supports custom gap distances", () => {
    const actor = getTargetDroneActor({
      riderDistanceMeters: 42,
      gapMeters: 135,
    })

    expect(actor.leadMeters).toBe(135)
    expect(actor.gapMeters).toBe(135)
    expect(actor.distance).toBe(177)
  })

  it("preserves leadMeters as a backward-compatible alias", () => {
    const actor = getTargetDroneActor({
      riderDistanceMeters: 42,
      leadMeters: 135,
    })

    expect(actor.leadMeters).toBe(135)
    expect(actor.gapMeters).toBe(135)
    expect(actor.distance).toBe(177)
  })

  it("uses the racing-line offset at the target distance", () => {
    const actor = getTargetDroneActor({ riderDistanceMeters: 1234.5 })

    expect(actor.lateralOffsetMeters).toBe(
      getRacingLineOffset(actor.distance)
    )
  })

  it("returns finite output across representative rider distances", () => {
    for (const riderDistanceMeters of [-50, 0, 17.5, 1000, 20000.25]) {
      const actor = getTargetDroneActor({ riderDistanceMeters })

      expect(Number.isFinite(actor.leadMeters)).toBe(true)
      expect(Number.isFinite(actor.distance)).toBe(true)
      expect(Number.isFinite(actor.gapMeters)).toBe(true)
      expect(Number.isFinite(actor.lateralOffsetMeters)).toBe(true)
    }
  })

  it("keeps stable identity and target-drone kind", () => {
    const first = getTargetDroneActor({ riderDistanceMeters: 0 })
    const second = getTargetDroneActor({ riderDistanceMeters: 500 })

    expect(first.id).toBe("target-drone-primary")
    expect(second.id).toBe(first.id)
    expect(first.kind).toBe("target-drone")
    expect(second.kind).toBe("target-drone")
    expect(first.visible).toBe(true)
  })

  it("defaults target drone visibility to true", () => {
    expect(getTargetDroneActor({ riderDistanceMeters: 0 }).visible).toBe(true)
  })

  it("supports hidden target drone actors", () => {
    expect(
      getTargetDroneActor({ riderDistanceMeters: 0, visible: false }).visible
    ).toBe(false)
  })
})

describe("getDroneCruisePowerWatts", () => {
  it("scales rider FTP by the drone cruise ratio", () => {
    expect(getDroneCruisePowerWatts({ riderFtpWatts: 250 })).toBe(220)
  })

  it("keeps invalid or tiny FTP finite", () => {
    for (const riderFtpWatts of [0, -100, Number.NaN]) {
      expect(
        Number.isFinite(getDroneCruisePowerWatts({ riderFtpWatts }))
      ).toBe(true)
    }
  })
})

describe("getTargetDroneRelativeSpeedMps", () => {
  it("returns zero at the drone cruise effort", () => {
    expect(
      getTargetDroneRelativeSpeedMps({
        riderPowerWatts: 220,
        riderFtpWatts: 250,
      })
    ).toBe(0)
  })

  it("returns positive speed above the drone cruise effort", () => {
    expect(
      getTargetDroneRelativeSpeedMps({
        riderPowerWatts: 260,
        riderFtpWatts: 250,
      })
    ).toBeGreaterThan(0)
  })

  it("returns negative speed below the drone cruise effort", () => {
    expect(
      getTargetDroneRelativeSpeedMps({
        riderPowerWatts: 200,
        riderFtpWatts: 250,
      })
    ).toBeLessThan(0)
  })

  it("maps 300W against 250W FTP to about 4m/s closing", () => {
    expect(
      getTargetDroneRelativeSpeedMps({
        riderPowerWatts: 300,
        riderFtpWatts: 250,
      })
    ).toBeCloseTo(4)
  })

  it("maps 180W against 250W FTP to about -2m/s opening", () => {
    expect(
      getTargetDroneRelativeSpeedMps({
        riderPowerWatts: 180,
        riderFtpWatts: 250,
      })
    ).toBeCloseTo(-2)
  })

  it("clamps very high power to max closing speed", () => {
    expect(
      getTargetDroneRelativeSpeedMps({
        riderPowerWatts: 2000,
        riderFtpWatts: 250,
      })
    ).toBe(FREE_RIDE_TARGETS.maxClosingSpeedMps)
  })

  it("clamps very low power to max opening speed", () => {
    expect(
      getTargetDroneRelativeSpeedMps({
        riderPowerWatts: 0,
        riderFtpWatts: 250,
      })
    ).toBe(-FREE_RIDE_TARGETS.maxOpeningSpeedMps)
  })

  it("returns zero for missing power", () => {
    expect(
      getTargetDroneRelativeSpeedMps({
        riderPowerWatts: null,
        riderFtpWatts: 250,
      })
    ).toBe(0)
  })
})

describe("getNextTargetDroneGapMeters", () => {
  it("reduces gap when relative speed is positive", () => {
    expect(
      getNextTargetDroneGapMeters({
        currentGapMeters: 100,
        riderPowerWatts: 300,
        riderFtpWatts: 250,
        deltaSeconds: 2,
      })
    ).toBeCloseTo(92)
  })

  it("increases gap when relative speed is negative", () => {
    expect(
      getNextTargetDroneGapMeters({
        currentGapMeters: 90,
        riderPowerWatts: 180,
        riderFtpWatts: 250,
        deltaSeconds: 2,
      })
    ).toBeCloseTo(94)
  })

  it("clamps at the minimum gap", () => {
    expect(
      getNextTargetDroneGapMeters({
        currentGapMeters: 20,
        riderPowerWatts: 2000,
        riderFtpWatts: 250,
        deltaSeconds: 2,
      })
    ).toBe(FREE_RIDE_TARGETS.minGapMeters)
  })

  it("clamps at the maximum gap", () => {
    expect(
      getNextTargetDroneGapMeters({
        currentGapMeters: 178,
        riderPowerWatts: 0,
        riderFtpWatts: 250,
        deltaSeconds: 2,
      })
    ).toBe(FREE_RIDE_TARGETS.maxGapMeters)
  })

  it("falls back to the default lead for invalid current gap", () => {
    expect(
      getNextTargetDroneGapMeters({
        currentGapMeters: Number.NaN,
        riderPowerWatts: null,
        riderFtpWatts: 250,
        deltaSeconds: 1,
      })
    ).toBe(FREE_RIDE_TARGETS.defaultLeadMeters)
  })

  it("does not advance for non-positive or invalid delta", () => {
    for (const deltaSeconds of [0, -1, Number.NaN]) {
      expect(
        getNextTargetDroneGapMeters({
          currentGapMeters: 100,
          riderPowerWatts: 300,
          riderFtpWatts: 250,
          deltaSeconds,
        })
      ).toBe(100)
    }
  })

  it("keeps output finite across representative inputs", () => {
    for (const currentGapMeters of [
      Number.NaN,
      -10,
      18,
      100,
      180,
      500,
    ]) {
      for (const riderPowerWatts of [null, 0, 180, 300, 2000]) {
        for (const riderFtpWatts of [Number.NaN, 0, 1, 150, 250]) {
          for (const deltaSeconds of [Number.NaN, -1, 0, 0.016, 0.05, 2]) {
            expect(
              Number.isFinite(
                getNextTargetDroneGapMeters({
                  currentGapMeters,
                  riderPowerWatts,
                  riderFtpWatts,
                  deltaSeconds,
                })
              )
            ).toBe(true)
          }
        }
      }
    }
  })
})
