import type {
  DispatchResult,
  TrainerCapabilities,
  TrainerCommand,
  TrainerCommandSource,
} from "./types"

export interface TrainerControlAPI {
  dispatch(
    command: TrainerCommand,
    source: TrainerCommandSource
  ): Promise<DispatchResult>
  getCapabilities(): TrainerCapabilities
}
