import type { RideTelemetry } from "@ramp/ride-core"

export type RideDashboardMetricTone = "default" | "danger" | "muted"

export type RideDashboardMetricProps = {
  label: string
  value: string
  valueSuffix?: string
  tone?: RideDashboardMetricTone
  className?: string
  valueClassName?: string
  valueSuffixClassName?: string
  testId?: string
}

export type RidePowerModuleProps = {
  targetWatts?: number | null
  powerWatts: number | null
  telemetrySource: RideTelemetry["telemetrySource"]
  telemetryStatus: RideTelemetry["telemetryStatus"]
  showTarget?: boolean
}

export type RideHeartCadenceModuleProps = {
  heartRateBpm: number | null
  cadenceRpm: number | null
}
