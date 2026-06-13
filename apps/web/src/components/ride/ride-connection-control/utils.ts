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
  const trainerName = runtime.trainerDetails?.name ?? "trainer"

  if (runtime.selectingTrainer) {
    return { status: "selecting" }
  }

  if (runtime.connecting) {
    return { status: "connecting", trainerName }
  }

  if (runtime.source !== "none") {
    return { status: "connected", trainerName }
  }

  if (runtime.connectionError) {
    return { status: "failed", message: runtime.connectionError }
  }

  return { status: "idle" }
}

export function getConnectionTriggerLabel(
  source: RideRuntimeController["source"]
): string {
  return source === "none" ? "Connect Trainer" : "Manage Connection"
}
