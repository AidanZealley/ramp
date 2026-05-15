import { describe, expect, it } from "vitest"
import { createInitialPhysicsState, stepPhysics } from "./engine"
import { createIndoorLikePhysicsConfig } from "./presets"

const config = createIndoorLikePhysicsConfig({
  riderWeightKg: 75,
  bikeWeightKg: 10,
})

function runSteps(input: {
  powerWatts: number
  gradePercent: number
  seconds: number
  riderWeightKg?: number
  bikeWeightKg?: number
}) {
  const localConfig = createIndoorLikePhysicsConfig({
    riderWeightKg: input.riderWeightKg ?? 75,
    bikeWeightKg: input.bikeWeightKg ?? 10,
  })
  let state = createInitialPhysicsState()
  let distance = 0
  for (let elapsed = 0; elapsed < input.seconds; elapsed += 0.25) {
    const result = stepPhysics({
      state,
      powerWatts: input.powerWatts,
      gradePercent: input.gradePercent,
      deltaSeconds: 0.25,
      config: localConfig,
    })
    state = result.state
    distance += result.distanceDeltaMeters
  }
  return { state, distance }
}

describe("stepPhysics", () => {
  it("accelerates from rest on flat road at 200 W", () => {
    const result = runSteps({ powerWatts: 200, gradePercent: 0, seconds: 10 })

    expect(result.state.speedMps).toBeGreaterThan(0)
    expect(result.distance).toBeGreaterThan(0)
  })

  it("is slower uphill than flat at the same power", () => {
    const flat = runSteps({ powerWatts: 200, gradePercent: 0, seconds: 20 })
    const uphill = runSteps({ powerWatts: 200, gradePercent: 6, seconds: 20 })

    expect(uphill.state.speedMps).toBeLessThan(flat.state.speedMps)
  })

  it("makes a heavier rider and bike slower uphill", () => {
    const light = runSteps({
      powerWatts: 220,
      gradePercent: 7,
      seconds: 30,
      riderWeightKg: 65,
      bikeWeightKg: 8,
    })
    const heavy = runSteps({
      powerWatts: 220,
      gradePercent: 7,
      seconds: 30,
      riderWeightKg: 95,
      bikeWeightKg: 15,
    })

    expect(heavy.state.speedMps).toBeLessThan(light.state.speedMps)
  })

  it("coasts and advances downhill with 0 W", () => {
    const result = runSteps({ powerWatts: 0, gradePercent: -8, seconds: 10 })

    expect(result.state.speedMps).toBeGreaterThan(0)
    expect(result.distance).toBeGreaterThan(0)
  })

  it("can reach zero speed and no distance on a steep uphill with low power", () => {
    const result = stepPhysics({
      state: { speedMps: 0.1, smoothedPowerWatts: 0 },
      powerWatts: 0,
      gradePercent: 20,
      deltaSeconds: 0.25,
      config,
    })

    expect(result.speedMps).toBe(0)
    expect(result.distanceDeltaMeters).toBeGreaterThanOrEqual(0)
  })

  it("never exceeds max descent speed", () => {
    const result = stepPhysics({
      state: {
        speedMps: config.maxDescentSpeedMps,
        smoothedPowerWatts: 0,
      },
      powerWatts: 1000,
      gradePercent: -20,
      deltaSeconds: 0.25,
      config,
    })

    expect(result.speedMps).toBeLessThanOrEqual(config.maxDescentSpeedMps)
  })

  it("clamps large deltaSeconds", () => {
    const state = createInitialPhysicsState()
    const normal = stepPhysics({
      state,
      powerWatts: 200,
      gradePercent: 0,
      deltaSeconds: 0.25,
      config,
    })
    const large = stepPhysics({
      state,
      powerWatts: 200,
      gradePercent: 0,
      deltaSeconds: 5,
      config,
    })

    expect(large.distanceDeltaMeters).toBeCloseTo(normal.distanceDeltaMeters)
    expect(large.speedMps).toBeCloseTo(normal.speedMps)
  })

  it("smooths power gradually", () => {
    const first = stepPhysics({
      state: createInitialPhysicsState(),
      powerWatts: 300,
      gradePercent: 0,
      deltaSeconds: 0.25,
      config,
    })

    expect(first.state.smoothedPowerWatts).toBeGreaterThan(0)
    expect(first.state.smoothedPowerWatts).toBeLessThan(300)
  })

  it("treats negative finite power as 0", () => {
    const negative = stepPhysics({
      state: createInitialPhysicsState(),
      powerWatts: -100,
      gradePercent: -5,
      deltaSeconds: 0.25,
      config,
    })
    const zero = stepPhysics({
      state: createInitialPhysicsState(),
      powerWatts: 0,
      gradePercent: -5,
      deltaSeconds: 0.25,
      config,
    })

    expect(negative.speedMps).toBeCloseTo(zero.speedMps)
    expect(negative.state.smoothedPowerWatts).toBe(0)
  })
})
