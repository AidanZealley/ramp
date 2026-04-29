import type { RideGamePlugin } from "@ramp/ride-core"
import { CountrysideGameView } from "./game-view"

export const countrysideGame: RideGamePlugin = {
  id: "countryside-r3f",
  displayName: "Countryside",
  GameView: CountrysideGameView,
}

export { CountrysideGameView }
export { generateWorldChunk, sampleRouteAtDistance } from "./procgen/generate"
export type {
  GenerateWorldChunkInput,
  RouteSample,
  TerrainPatch,
  Vec3Tuple,
  WorldChunk,
  WorldProp,
  WorldPropKind,
  WorldState,
  WorldTheme,
} from "./procgen/types"
