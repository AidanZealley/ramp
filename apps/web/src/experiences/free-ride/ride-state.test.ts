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

  it("initializes weapon charge to 0", () => {
    expect(createRideState().weaponCharge).toBe(0)
  })

  it("initializes weapon charge active as false", () => {
    expect(createRideState().weaponChargeActive).toBe(false)
  })

  it("initializes target drone lifecycle state", () => {
    const rideState = createRideState()

    expect(rideState.targetDroneAlive).toBe(true)
    expect(rideState.targetDroneRespawnSecondsRemaining).toBe(0)
  })

  it("initializes weapon firing state", () => {
    const rideState = createRideState()

    expect(rideState.weaponFiring).toBe(false)
    expect(rideState.weaponFireSecondsRemaining).toBe(0)
    expect(rideState.weaponFireSequence).toBe(0)
    expect(rideState.weaponFireOriginDistance).toBe(0)
    expect(rideState.weaponFireTargetDistance).toBe(0)
    expect(rideState.weaponFireTargetLateralOffsetMeters).toBe(0)
    expect(rideState.weaponKillBoomSecondsRemaining).toBe(0)
    expect(rideState.weaponKillSequence).toBe(0)
  })
})
