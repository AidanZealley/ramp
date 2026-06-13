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

export function getConnectionTriggerLabel(
  source: RideRuntimeController["source"]
): string {
  return source === "none" ? "Connect Trainer" : "Manage Connection"
}
