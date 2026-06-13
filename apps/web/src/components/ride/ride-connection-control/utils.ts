import type { RideRuntimeController } from "@/ride/use-ride-runtime"

export type ConnectionState =
  | { status: "idle" }
  | { status: "selecting" }
  | { status: "connecting"; trainerName: string }
  | { status: "connected"; trainerName: string }
  | { status: "failed"; message: string }

export function getConnectionState(
  runtime: RideRuntimeController
): ConnectionState {
  if (runtime.connectionView) {
    return getProjectedConnectionState(runtime)
  }

  return getLegacyConnectionState(runtime)
}

function getProjectedConnectionState(
  runtime: RideRuntimeController
): ConnectionState {
  const view = runtime.connectionView
  const trainerName = view.trainerName ?? "trainer"

  if (view.phase === "selecting") return { status: "selecting" }
  if (view.phase === "connecting") return { status: "connecting", trainerName }
  if (view.phase === "connected") return { status: "connected", trainerName }
  if (view.phase === "failed") {
    return {
      status: "failed",
      message:
        view.error?.message ??
        runtime.connectionError ??
        "Trainer connection failed.",
    }
  }
  return { status: "idle" }
}

function getLegacyConnectionState(
  runtime: RideRuntimeController
): ConnectionState {
  const trainerName = runtime.trainerDetails?.name ?? "trainer"
  const busyState = getLegacyBusyState(runtime, trainerName)
  if (busyState) return busyState

  const failedState = getLegacyFailedState(runtime)
  if (failedState) return failedState

  if (runtime.connection.status === "connected")
    return { status: "connected", trainerName }

  return { status: "idle" }
}

function getLegacyBusyState(
  runtime: RideRuntimeController,
  trainerName: string
): ConnectionState | null {
  if (runtime.selectingTrainer) return { status: "selecting" }
  if (runtime.connecting) return { status: "connecting", trainerName }
  return null
}

function getLegacyFailedState(
  runtime: RideRuntimeController
): ConnectionState | null {
  if (runtime.connection.status === "error") {
    return {
      status: "failed",
      message:
        runtime.connection.error?.message ??
        runtime.connectionError ??
        "Trainer connection failed.",
    }
  }

  if (runtime.connectionError) {
    return { status: "failed", message: runtime.connectionError }
  }

  return null
}

export function getConnectionTriggerLabel(
  source: RideRuntimeController["source"]
): string {
  return source === "none" ? "Connect Trainer" : "Manage Connection"
}
