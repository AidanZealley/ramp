import type { RideTelemetry } from "@ramp/ride-core"

export function getSourceLabel(
  source: RideTelemetry["telemetrySource"]
): string {
  if (source === "simulated") return "Simulator"
  if (source) return "Trainer"
  return "No source"
}

export function formatSpeedKph(speedMps: number | null): string {
  if (speedMps === null) return "-- km/h"
  return `${(speedMps * 3.6).toFixed(1)} km/h`
}
