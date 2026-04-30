import type React from "react"
import type {
  Capability,
  TrainerCapabilities,
  TrainerCommand,
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
}

export type RideSessionState = {
  telemetry: RideTelemetry
  trainerConnected: boolean
  paused: boolean
  activeControlMode: "manual" | "workout" | "experience"
  lastError: string | null
}

export type TrainerCommandSource = "user" | "workout" | "experience" | "system"

export type DispatchResult = { ok: true } | { ok: false; reason: string }

export type DispatchOptions = {
  priority?: "normal" | "immediate"
}

export type RideTrainerTelemetry = {
  powerWatts: number | null
  cadenceRpm: number | null
  speedMps: number | null
  heartRateBpm: number | null
}

export type RideTrainerError = {
  message: string
}

export type RideTrainerConnectionState =
  | { kind: "disconnected" }
  | { kind: "connecting" }
  | { kind: "connected" }
  | { kind: "reconnecting"; attempts: number }
  | { kind: "error"; error: RideTrainerError }

export interface RideTrainerAdapter {
  readonly capabilities: TrainerCapabilities
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  sendCommand: (command: TrainerCommand) => Promise<void>
  subscribeTelemetry: (listener: (t: RideTrainerTelemetry) => void) => () => void
  subscribeState: (listener: (s: RideTrainerConnectionState) => void) => () => void
  subscribeError: (listener: (e: RideTrainerError) => void) => () => void
}

export interface RideSessionController {
  getState: () => RideSessionState
  subscribe: (listener: () => void) => () => void
  connectTrainer: (trainer: RideTrainerAdapter) => Promise<void>
  disconnectTrainer: () => Promise<void>
  pause: () => void
  resume: () => void
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
