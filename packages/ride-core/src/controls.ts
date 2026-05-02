import type {
  DispatchOptions,
  DispatchResult,
  TrainerCapabilitiesView,
  TrainerCommand,
  TrainerCommandSource,
} from "./types"

export interface TrainerControlAPI {
  dispatch: (
    command: TrainerCommand,
    source: TrainerCommandSource,
    options?: DispatchOptions
  ) => Promise<DispatchResult>
  getCapabilities: () => TrainerCapabilitiesView
}
