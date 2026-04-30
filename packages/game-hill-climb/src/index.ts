import type { RideGamePlugin } from "@ramp/ride-core"
import { HillClimbGameView } from "./game-view"

export const hillClimbGame: RideGamePlugin = {
  id: "hill-climb",
  displayName: "Hill Climb",
  GameView: HillClimbGameView,
}

export { HillClimbGameView }
export { HILL_CLIMB_STAGE, getStageDistanceMeters } from "./stage-data"
export { sampleStageAtDistance } from "./stage-sampling"
export type {
  HillClimbRunSummary,
  HillClimbSegment,
  HillClimbStage,
  HillClimbStageSample,
} from "./types"
