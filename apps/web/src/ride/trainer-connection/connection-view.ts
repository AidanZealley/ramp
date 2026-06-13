import type { RideConnectionView, RideConnectionViewInput } from "./types"

export function createRideConnectionView({
  connection,
  source,
  trainerDetails,
  pendingTrainerDetails,
  localError,
  bleAvailable,
  selectingTrainer,
  connecting,
  trainer,
  simulatorAvailable,
}: RideConnectionViewInput): RideConnectionView {
  const activeDetails = pendingTrainerDetails ?? trainerDetails
  const error = connection.error ?? localError

  if (selectingTrainer) {
    return {
      phase: "selecting",
      source,
      trainerName: activeDetails?.name ?? null,
      error: null,
      bleAvailable,
      canConnectBle: false,
      canUseSimulator: false,
      canCancel: true,
    }
  }

  if (connecting || connection.status === "connecting") {
    return {
      phase: "connecting",
      source,
      trainerName: activeDetails?.name ?? null,
      error: null,
      bleAvailable,
      canConnectBle: false,
      canUseSimulator: false,
      canCancel: true,
    }
  }

  if (connection.status === "error" || error) {
    return {
      phase: "failed",
      source,
      trainerName: activeDetails?.name ?? null,
      error,
      bleAvailable,
      canConnectBle: bleAvailable,
      canUseSimulator: simulatorAvailable,
      canCancel: false,
    }
  }

  if (connection.status === "connected") {
    return {
      phase: "connected",
      source,
      trainerName: activeDetails?.name ?? null,
      error: null,
      bleAvailable,
      canConnectBle: bleAvailable,
      canUseSimulator: simulatorAvailable && trainer === null,
      canCancel: false,
    }
  }

  return {
    phase: "idle",
    source,
    trainerName: null,
    error: null,
    bleAvailable,
    canConnectBle: bleAvailable,
    canUseSimulator: simulatorAvailable,
    canCancel: false,
  }
}
