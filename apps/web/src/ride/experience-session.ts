import type {
  DispatchOptions,
  DispatchResult,
  RideFrameData,
  RideSessionController,
  RideSessionState,
  TrainerCapabilitiesView,
  TrainerCommand,
} from "@ramp/ride-core"

export type ExperienceSessionAPI = {
  getState: () => RideSessionState
  subscribe: (listener: () => void) => () => void
  subscribeFrame: (listener: (frame: RideFrameData) => void) => () => void
  pause: () => void
  resume: () => void
  controls: {
    dispatch: (
      command: TrainerCommand,
      source: "experience",
      options?: DispatchOptions
    ) => Promise<DispatchResult>
    getCapabilities: () => TrainerCapabilitiesView
  }
}

export function narrowForExperience(
  session: RideSessionController
): ExperienceSessionAPI {
  return {
    getState: session.getState,
    subscribe: session.subscribe,
    subscribeFrame: session.subscribeFrame,
    pause: session.pause,
    resume: session.resume,
    controls: {
      dispatch: (command, _source, options) =>
        session.controls.dispatch(command, "experience", options),
      getCapabilities: session.controls.getCapabilities,
    },
  }
}
