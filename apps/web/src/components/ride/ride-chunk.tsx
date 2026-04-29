import type { WorldChunk } from "@ramp/ride-engine"
import { RideProps } from "./ride-props"
import { RideRoad } from "./ride-road"
import { RideTerrain } from "./ride-terrain"

type RideChunkProps = {
  chunk: WorldChunk
}

export function RideChunk({ chunk }: RideChunkProps) {
  return (
    <group>
      <RideTerrain patches={chunk.terrainPatches} />
      <RideRoad routeSamples={chunk.routeSamples} />
      <RideProps props={chunk.props} />
    </group>
  )
}
