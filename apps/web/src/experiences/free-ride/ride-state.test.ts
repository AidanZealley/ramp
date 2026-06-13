import { describe, expect, it } from "vitest"
import { FREE_RIDE_TARGETS } from "./free-ride-config"
import { createRideState } from "./ride-state"

describe("createRideState", () => {
  it("initializes target drone draft lock as inactive", () => {
    expect(createRideState().targetDroneDraftLocked).toBe(false)
  })

  it("initializes target drone draft quality to 0", () => {
    expect(createRideState().targetDroneDraftQuality).toBe(0)
  })

  it("initializes target drone gap to the default lead", () => {
    expect(createRideState().targetDroneGapMeters).toBe(
      FREE_RIDE_TARGETS.defaultLeadMeters
    )
  })
})
