import type {
  Capability,
  TrainerCapabilities,
  TrainerCommand,
  TrainerConnectionState,
  TrainerError,
  TrainerSource,
  TrainerSourceKind,
  TrainerTelemetry,
} from "@ramp/ride-contracts"
import type { TrainerControlAPI } from "./controls"

export type TrainerCapabilitiesView = ReadonlySet<Capability>

export type RideTelemetry = {
  elapsedSeconds: number
  distanceMeters: number
  speedMps: number | null
  powerWatts: number | null
  cadenceRpm: number | null
  heartRateBpm: number | null
  trainerStatus: "disconnected" | "connecting" | "ready" | "error"
  telemetryStatus: "missing" | "fresh" | "stale"
  lastTelemetryAtMs: number | null
  telemetryAgeMs: number | null
  telemetrySource: TrainerSourceKind | null
}

export type RideSessionState = {
  telemetry: RideTelemetry
  trainerConnected: boolean
  paused: boolean
  activeControlMode: "manual" | "experience"
  lastError: string | null
  lastTrainerError: TrainerError | null
}

export type TrainerCommandSource = "user" | "experience" | "system"

export type DispatchResult = { ok: true } | { ok: false; reason: string }

export type DispatchOptions = {
  priority?: "normal" | "immediate"
  delivery?: "enqueued" | "acknowledged"
  timeoutMs?: number
}

export type RideConnectionResult =
  | { ok: true }
  | { ok: false; error: TrainerError }

export type ReadonlyStore<T> = {
  getSnapshot: () => T
  subscribe: (listener: () => void) => () => void
}

export type Subscribable<T> = {
  subscribe: (listener: (value: T) => void) => () => void
}

export type RideDisconnectOptions = {
  clearError?: boolean
}

export type RideFrameData = {
  telemetry: RideTrainerTelemetry | null
  elapsedSeconds: number
  distanceMeters: number
  deltaMs: number
}

export type RideTrainerTelemetry = TrainerTelemetry
export type RideTrainerError = TrainerError
export type RideTrainerConnectionState = TrainerConnectionState

/**
 * Subset of {@link TrainerSource} consumed by ride-core's session controller.
 * Any TrainerSource satisfies this interface, but ride-core doesn't require
 * the full `kind` / `state` fields — only the connect/command/subscribe surface.
 */
export type RideTrainerAdapter = Pick<
  TrainerSource,
  | "capabilities"
  | "connect"
  | "disconnect"
  | "sendCommand"
  | "subscribeTelemetry"
  | "subscribeState"
  | "subscribeError"
>

export interface RideSessionController {
  getState: () => RideSessionState
  getLatestTelemetry: () => RideTrainerTelemetry | null
  subscribe: (listener: () => void) => () => void
  subscribeFrame: (listener: (frame: RideFrameData) => void) => () => void
  connectTrainer: (trainer: RideTrainerAdapter) => Promise<RideConnectionResult>
  disconnectTrainer: (options?: RideDisconnectOptions) => Promise<void>
  pause: () => void
  resume: () => void
  dispose: () => Promise<void>
  controls: TrainerControlAPI
}

export type { Capability, TrainerCapabilities, TrainerCommand }
