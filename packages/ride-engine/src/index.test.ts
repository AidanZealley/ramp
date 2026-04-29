import { describe, expect, it } from "vitest"
import {
  computeSpeedMps,
  createRideSimulator,
  generateWorldChunk,
  getWorkoutSegmentAtElapsed,
  sampleRouteAtDistance,
  type WorldState,
} from "./index"

const world: WorldState = {
  theme: "countryside",
  seed: "ramp-countryside-v1",
  chunkLengthMeters: 120,
}

describe("world generation", () => {
  it("produces identical chunks for the same seed", () => {
    expect(generateWorldChunk({ ...world, index: 2 })).toEqual(
      generateWorldChunk({ ...world, index: 2 })
    )
  })

  it("connects adjacent route samples without jumps", () => {
    const first = generateWorldChunk({ ...world, index: 0 })
    const second = generateWorldChunk({ ...world, index: 1 })

    expect(first.routeSamples.at(-1)).toEqual(second.routeSamples[0])
  })

  it("does not spawn props inside the road clearance zone", () => {
    const chunk = generateWorldChunk({ ...world, index: 3 })

    for (const prop of chunk.props) {
      const route = sampleRouteAtDistance(world, prop.position[2])
      const lateralDistance = Math.hypot(
        prop.position[0] - route.position[0],
        prop.position[2] - route.position[2]
      )

      expect(lateralDistance).toBeGreaterThanOrEqual(5.9)
    }
  })

  it("returns stable route position and tangent values", () => {
    expect(sampleRouteAtDistance(world, 184.5)).toEqual(
      sampleRouteAtDistance(world, 184.5)
    )
  })
})

describe("ride simulator", () => {
  it("increases speed monotonically with power", () => {
    const low = computeSpeedMps({
      powerWatts: 120,
      cadenceRpm: 90,
      mode: "manual",
    })
    const high = computeSpeedMps({
      powerWatts: 300,
      cadenceRpm: 90,
      mode: "manual",
    })

    expect(high).toBeGreaterThan(low)
  })

  it("advances distance based on elapsed time and speed", () => {
    const simulator = createRideSimulator({
      input: { powerWatts: 180, cadenceRpm: 90 },
    })
    const before = simulator.getTelemetry()
    const after = simulator.tick(10)

    expect(after.elapsedSeconds).toBe(10)
    expect(after.distanceMeters).toBeCloseTo(before.speedMps * 10)
  })
})

describe("workout segments", () => {
  it("handles exact boundary times", () => {
    const intervals = [
      { startPower: 70, endPower: 70, durationSeconds: 60 },
      { startPower: 110, endPower: 110, durationSeconds: 30 },
    ]

    expect(getWorkoutSegmentAtElapsed(intervals, 60, 200)?.index).toBe(1)
    expect(getWorkoutSegmentAtElapsed(intervals, 90, 200)?.index).toBe(1)
  })
})
