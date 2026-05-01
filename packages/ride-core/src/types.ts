import type React from "react"
import type {
  Capability,
  TrainerCapabilities,
  TrainerCommand,
  TrainerConnectionState,
  TrainerError,
  TrainerSourceKind,
  TrainerTelemetry,
} from "@ramp/ride-contracts"
import type { TrainerControlAPI } from "./controls"

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
  activeControlMode: "manual" | "workout" | "experience"
  lastError: string | null
  lastTrainerError: TrainerError | null
}

export type TrainerCommandSource = "user" | "workout" | "experience" | "system"

export type DispatchResult = { ok: true } | { ok: false; reason: string }

export type DispatchOptions = {
  priority?: "normal" | "immediate"
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

export interface RideTrainerAdapter {
  readonly capabilities: TrainerCapabilities
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  sendCommand: (command: TrainerCommand) => Promise<void>
  subscribeTelemetry: (
    listener: (t: RideTrainerTelemetry) => void
  ) => () => void
  subscribeState: (
    listener: (s: RideTrainerConnectionState) => void
  ) => () => void
  subscribeError: (listener: (e: RideTrainerError) => void) => () => void
}

export interface RideSessionController {
  getState: () => RideSessionState
  getLatestTelemetry: () => RideTrainerTelemetry | null
  subscribe: (listener: () => void) => () => void
  subscribeFrame: (listener: (frame: RideFrameData) => void) => () => void
  connectTrainer: (trainer: RideTrainerAdapter) => Promise<void>
  disconnectTrainer: () => Promise<void>
  pause: () => void
  resume: () => void
  dispose: () => Promise<void>
  controls: TrainerControlAPI
}

export type RideExperiencePlugin = {
  id: string
  displayName: string
  ExperienceView: React.ComponentType<{
    session: RideSessionController
  }>
}

export type { Capability, TrainerCapabilities, TrainerCommand }
