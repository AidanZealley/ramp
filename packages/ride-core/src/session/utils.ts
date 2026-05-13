import type { TrainerError } from "@ramp/ride-contracts"
import type { RideTelemetry } from "../types"

export const initialTelemetry = (): RideTelemetry => ({
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
})

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

export function toTrainerError(error: unknown): TrainerError {
  if (isTrainerError(error)) return error
  if (error instanceof Error) {
    return { code: "unknown", message: error.message, cause: error }
  }
  return { code: "unknown", message: String(error), cause: error }
}

export async function withOptionalTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number | undefined,
  reason: string
): Promise<T> {
  if (timeoutMs === undefined) return promise
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(reason)), timeoutMs)
      }),
    ])
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle)
  }
}

export function isTrainerError(value: unknown): value is TrainerError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    typeof (value as { code: unknown }).code === "string" &&
    typeof (value as { message: unknown }).message === "string"
  )
}
