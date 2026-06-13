import { describe, expect, it } from "vitest"
import { FREE_RIDE_TARGETS } from "./free-ride-config"
import { getRacingLineOffset } from "./track"
import { getTargetDroneActor } from "./actors"

describe("getTargetDroneActor", () => {
  it("places the default target exactly 100m ahead", () => {
    const actor = getTargetDroneActor({ riderDistanceMeters: 250 })

    expect(actor.leadMeters).toBe(FREE_RIDE_TARGETS.defaultLeadMeters)
    expect(actor.distance).toBe(350)
    expect(actor.gapMeters).toBe(FREE_RIDE_TARGETS.defaultLeadMeters)
  })

  it("supports custom lead distances", () => {
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
})
