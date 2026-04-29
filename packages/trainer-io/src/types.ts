import type {
  TrainerCapabilities,
  TrainerCommand,
} from "@ramp/ride-contracts"

export type TrainerTelemetryMessage = {
  powerWatts: number | null
  cadenceRpm: number | null
  speedMps: number | null
  heartRateBpm: number | null
  timestampMs: number
  source: TrainerSourceKind
}

export type TrainerSourceKind = "mock" | "wahoo-kickr-ble" | "ftms-ble" | "ant"

export type TrainerConnectionState =
  | { kind: "disconnected" }
  | { kind: "connecting" }
  | { kind: "connected" }
  | { kind: "reconnecting"; attempts: number }
  | { kind: "error"; error: TrainerError }

export type TrainerError = {
  code: "permission" | "unsupported" | "transport" | "command-rejected" | "unknown"
  message: string
  cause?: unknown
}

export interface TrainerSource {
  readonly kind: TrainerSourceKind
  readonly capabilities: TrainerCapabilities
  readonly state: TrainerConnectionState
  connect(): Promise<void>
  disconnect(): Promise<void>
  sendCommand(command: TrainerCommand): Promise<void>
  subscribeTelemetry(listener: (t: TrainerTelemetryMessage) => void): () => void
  subscribeState(listener: (s: TrainerConnectionState) => void): () => void
  subscribeError(listener: (e: TrainerError) => void): () => void
}

export * from "@ramp/ride-contracts"
