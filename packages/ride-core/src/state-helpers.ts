import type { RideTelemetry } from "./types"

export function initialTelemetry(): RideTelemetry {
  return {
    elapsedSeconds: 0,
    distanceMeters: 0,
    speedMps: null,
    powerWatts: null,
    cadenceRpm: null,
    heartRateBpm: null,
    trainerStatus: "disconnected",
    telemetryStatus: "missing",
    lastTelemetryAtMs: null,
    telemetryAgeMs: null,
    telemetrySource: null,
  }
}

export function telemetryEqual(
  previous: RideTelemetry,
  next: RideTelemetry
): boolean {
  return (
    previous.elapsedSeconds === next.elapsedSeconds &&
    previous.distanceMeters === next.distanceMeters &&
    previous.speedMps === next.speedMps &&
    previous.powerWatts === next.powerWatts &&
    previous.cadenceRpm === next.cadenceRpm &&
    previous.heartRateBpm === next.heartRateBpm &&
    previous.trainerStatus === next.trainerStatus &&
    previous.telemetryStatus === next.telemetryStatus &&
    previous.lastTelemetryAtMs === next.lastTelemetryAtMs &&
    previous.telemetryAgeMs === next.telemetryAgeMs &&
    previous.telemetrySource === next.telemetrySource
  )
}

export function mapTrainerStatus(
  kind: "disconnected" | "connecting" | "connected" | "reconnecting" | "error"
): RideTelemetry["trainerStatus"] {
  if (kind === "connected") return "ready"
  if (kind === "connecting" || kind === "reconnecting") return "connecting"
  if (kind === "error") return "error"
  return "disconnected"
}
