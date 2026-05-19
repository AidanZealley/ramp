import { describe, expect, it } from "vitest"
import { SimulatedRider } from "./simulated-rider"
import type { SimulatedRiderState } from "./simulation-types"

describe("SimulatedRider", () => {
  it("applies initial state defaults and overrides", () => {
    expect(new SimulatedRider().state).toMatchObject({
      powerWatts: 180,
      cadenceRpm: 85,
      heartRateBpm: null,
      paused: false,
      powerMode: "manual",
    })

    expect(
      new SimulatedRider({
        initial: { powerWatts: 220, cadenceRpm: 92, powerMode: "erg-auto" },
      }).state
    ).toMatchObject({
      powerWatts: 220,
      cadenceRpm: 92,
      powerMode: "erg-auto",
    })
  })

  it("clamps manual power and switches to manual mode", () => {
    const rider = new SimulatedRider({
      initial: { powerMode: "erg-auto" },
    })

    rider.dispatch({ type: "setManualPower", watts: 800 })

    expect(rider.state).toMatchObject({
      powerWatts: 700,
      powerMode: "manual",
    })
  })

  it("clamps cadence and heart-rate values and supports null heart rate", () => {
    const rider = new SimulatedRider()

    rider.dispatch({ type: "setCadence", rpm: 20 })
    rider.dispatch({ type: "setHeartRate", bpm: 260 })
    expect(rider.state).toMatchObject({ cadenceRpm: 40, heartRateBpm: 240 })

    rider.dispatch({ type: "setCadence", rpm: 140 })
    rider.dispatch({ type: "setHeartRate", bpm: null })
    expect(rider.state).toMatchObject({ cadenceRpm: 130, heartRateBpm: null })
  })

  it("applies pause commands", () => {
    const rider = new SimulatedRider()

    rider.dispatch({ type: "setPaused", paused: true })

    expect(rider.state.paused).toBe(true)
  })

  it("ramps ERG auto power up and down by configured watts per second", () => {
    const rider = new SimulatedRider({
      rampWattsPerSecond: 50,
      initial: { powerWatts: 100, powerMode: "erg-auto" },
    })

    rider.followErgTarget(250, 1000)
    expect(rider.state.powerWatts).toBe(150)

    rider.followErgTarget(25, 2000)
    expect(rider.state.powerWatts).toBe(50)
  })

  it("does not follow ERG target outside erg-auto mode or with null target", () => {
    const rider = new SimulatedRider({
      initial: { powerWatts: 100, powerMode: "manual" },
    })

    rider.followErgTarget(250, 1000)
    expect(rider.state.powerWatts).toBe(100)

    rider.dispatch({ type: "setPowerMode", mode: "erg-auto" })
    rider.followErgTarget(null, 1000)
    expect(rider.state.powerWatts).toBe(100)
  })

  it("subscribers receive cloned state snapshots", () => {
    const rider = new SimulatedRider()
    const snapshots: Array<SimulatedRiderState> = []
    rider.subscribeState((state) => snapshots.push(state))

    rider.dispatch({ type: "setManualPower", watts: 210 })
    snapshots[0].powerWatts = 1

    expect(rider.state.powerWatts).toBe(210)
  })
})
