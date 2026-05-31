import type { RideTelemetry } from "@ramp/ride-core"
import { formatSpeedMps } from "@/lib/units"

export function getSourceLabel(
  source: RideTelemetry["telemetrySource"]
): string {
  if (source === "simulated") return "Simulator"
  if (source) return "Trainer"
  return "No source"
}

export function formatSpeedKph(speedMps: number | null): string {
  return formatSpeedMps(speedMps, "metric")
}
