import { describe, expect, it } from "vitest"
import {
  generateWorldChunk,
  sampleRouteAtDistance,
  type WorldState,
} from "./index"

const world: WorldState = {
  theme: "countryside",
  seed: "ramp-countryside-v1",
  chunkLengthMeters: 120,
}

describe("countryside procgen", () => {
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
})
