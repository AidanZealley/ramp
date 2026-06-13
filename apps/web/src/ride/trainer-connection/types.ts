import type { RideExperienceConnection } from "@/ride/experience-runtime"
import type { TrainerError, TrainerSource } from "@ramp/trainer-io"

export type RideTrainerSource = "none" | "simulated" | "ble"

export type RideSavedTrainer = {
  id: string
  name: string | null
}

export type RideTrainerDetails = {
  name: string
  source: Exclude<RideTrainerSource, "none">
}

export type RideConnectionPhase =
  | "idle"
  | "selecting"
  | "connecting"
  | "connected"
  | "failed"

export type RideConnectionView = {
  phase: RideConnectionPhase
  source: RideTrainerSource
  trainerName: string | null
  error: TrainerError | null
  bleAvailable: boolean
  canConnectBle: boolean
  canUseSimulator: boolean
  canCancel: boolean
}

export type RideConnectionViewInput = {
  connection: Pick<RideExperienceConnection, "status" | "error">
  source: RideTrainerSource
  trainerDetails: RideTrainerDetails | null
  pendingTrainerDetails: RideTrainerDetails | null
  localError: TrainerError | null
  bleAvailable: boolean
  selectingTrainer: boolean
  connecting: boolean
  trainer: TrainerSource | null
  simulatorAvailable: boolean
}
