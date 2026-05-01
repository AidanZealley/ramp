import type {
  TrainerCapabilities,
  TrainerCommand,
  TrainerConnectionState,
  TrainerError,
  TrainerSourceKind,
  TrainerTelemetry,
} from "@ramp/ride-contracts"

export type TrainerTelemetryMessage = TrainerTelemetry

export interface TrainerSource {
  readonly kind: TrainerSourceKind
  readonly capabilities: TrainerCapabilities
  state: TrainerConnectionState
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  sendCommand: (command: TrainerCommand) => Promise<void>
  subscribeTelemetry: (
    listener: (t: TrainerTelemetryMessage) => void
  ) => () => void
  subscribeState: (listener: (s: TrainerConnectionState) => void) => () => void
  subscribeError: (listener: (e: TrainerError) => void) => () => void
}

export * from "@ramp/ride-contracts"
