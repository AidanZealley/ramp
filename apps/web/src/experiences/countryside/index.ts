import { CountrysideExperienceView } from "./countryside-experience-view"
import type { RideExperiencePlugin } from "@/ride/experience-runtime"

export const countrysideExperience: RideExperiencePlugin = {
  id: "countryside-r3f",
  displayName: "Countryside",
  ExperienceView: CountrysideExperienceView,
}

export { CountrysideExperienceView }
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
