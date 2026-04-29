import type { WorldChunk } from "./procgen/types"
import { RideProps } from "./props"
import { RideRoad } from "./road"
import { RideTerrain } from "./terrain"

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
