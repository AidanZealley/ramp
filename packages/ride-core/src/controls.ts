import type {
  DispatchOptions,
  DispatchResult,
  TrainerCapabilities,
  TrainerCommand,
  TrainerCommandSource,
} from "./types"

export interface TrainerControlAPI {
  dispatch: (
    command: TrainerCommand,
    source: TrainerCommandSource,
    options?: DispatchOptions
  ) => Promise<DispatchResult>
  getCapabilities: () => TrainerCapabilities
}
