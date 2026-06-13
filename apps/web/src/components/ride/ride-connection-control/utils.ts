import type { RideRuntimeController } from "@/ride/use-ride-runtime"

export function getConnectionTriggerLabel(
  source: RideRuntimeController["source"]
): string {
  return source === "none" ? "Connect Trainer" : "Manage Connection"
}

export function getAutoConnectMessage(
  runtime: RideRuntimeController
): string | null {
  const trainerName = runtime.autoConnect.lastTrainer?.name ?? "saved trainer"

  switch (runtime.autoConnect.status) {
    case "checking":
      return `Looking for ${trainerName}.`
    case "connecting":
      return `Connecting to ${trainerName}.`
    case "cancelled":
      return "Automatic reconnect cancelled."
    case "failed":
      return runtime.autoConnect.error ?? "Automatic reconnect failed."
    case "unavailable":
      return (
        runtime.autoConnect.error ??
        "Automatic reconnect is unavailable in this browser."
      )
    case "succeeded":
      return `Connected to ${trainerName}.`
    default:
      return null
  }
}

export function isAutoConnectActive(runtime: RideRuntimeController): boolean {
  return (
    runtime.autoConnect.status === "checking" ||
    runtime.autoConnect.status === "connecting"
  )
}
