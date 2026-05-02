export const Capability = {
  ReadPower: "read.power",
  ReadCadence: "read.cadence",
  ReadSpeed: "read.speed",
  ReadHeartRate: "read.heartRate",
  TargetPower: "write.targetPower",
  Resistance: "write.resistance",
  SimulationGrade: "write.simulationGrade",
  Calibration: "write.calibration",
} as const

export type Capability = (typeof Capability)[keyof typeof Capability]

export type TrainerCapabilities = ReadonlySet<Capability>

export type TrainerCommand =
  | { type: "setTargetPower"; watts: number }
  | { type: "setResistance"; level: number }
  | { type: "setSimulationGrade"; gradePercent: number; windSpeedMps?: number }
  | { type: "setMode"; mode: "erg" | "resistance" | "simulation" | "free" }
  | { type: "requestCalibration" }
  | { type: "disconnect" }

export type TrainerSourceKind = "mock" | "wahoo-kickr-ble" | "ftms-ble" | "ant"

export type TrainerTelemetry = {
  powerWatts: number | null
  cadenceRpm: number | null
  speedMps: number | null
  heartRateBpm: number | null
  timestampMs: number
  source: TrainerSourceKind
}

export type TrainerConnectionState =
  | { kind: "disconnected" }
  | { kind: "connecting" }
  | { kind: "connected" }
  | { kind: "reconnecting"; attempts: number }
  | { kind: "error"; error: TrainerError }

export type TrainerErrorCode =
  | "permission"
  | "unsupported"
  | "transport"
  | "command-rejected"
  | "stale-telemetry"
  | "validation"
  | "timeout"
  | "unknown"

export type TrainerError = {
  code: TrainerErrorCode
  message: string
  cause?: unknown
}

// ---------------------------------------------------------------------------
// Subject — canonical reactive primitive shared across all packages
// ---------------------------------------------------------------------------

export class Subject<T> {
  private readonly listeners = new Set<(value: T) => void>()

  subscribe(listener: (value: T) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(value: T): void {
    for (const listener of this.listeners) {
      try {
        listener(value)
      } catch (err) {
        console.error("Subject listener threw", err)
      }
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}

// ---------------------------------------------------------------------------
// Shared trainer adapter interface — used by both trainer-io and ride-core
// ---------------------------------------------------------------------------

export interface TrainerSource {
  readonly kind: TrainerSourceKind
  readonly capabilities: TrainerCapabilities
  state: TrainerConnectionState
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  sendCommand: (command: TrainerCommand) => Promise<void>
  subscribeTelemetry: (
    listener: (t: TrainerTelemetry) => void
  ) => () => void
  subscribeState: (listener: (s: TrainerConnectionState) => void) => () => void
  subscribeError: (listener: (e: TrainerError) => void) => () => void
}

// ---------------------------------------------------------------------------
// commandCapability — maps a command to the capability it requires
// ---------------------------------------------------------------------------

export function commandCapability(command: TrainerCommand): Capability | null {
  if (command.type === "setTargetPower") return Capability.TargetPower
  if (command.type === "setResistance") return Capability.Resistance
  if (command.type === "setSimulationGrade") return Capability.SimulationGrade
  if (command.type === "requestCalibration") return Capability.Calibration
  return null
}

export const RIDE_CONTRACT_VERSION = "1.0.0" as const

const VALID_MODES = ["erg", "resistance", "simulation", "free"] as const

export const TRAINER_COMMAND_LIMITS = {
  targetPowerWatts: { min: 0, max: 2500 },
  resistanceLevel: { min: 0, max: 100 },
  simulationGradePercent: { min: -25, max: 25 },
  windSpeedMps: { min: -20, max: 20 },
} as const

type CommandValidationSuccess = { ok: true }
type CommandValidationFailure = { ok: false; reason: string }

export function validateTrainerCommand(
  command: TrainerCommand
): CommandValidationSuccess | CommandValidationFailure {
  switch (command.type) {
    case "setTargetPower":
      return validateIntegerRange(
        command.watts,
        TRAINER_COMMAND_LIMITS.targetPowerWatts.min,
        TRAINER_COMMAND_LIMITS.targetPowerWatts.max,
        "setTargetPower.watts"
      )
    case "setResistance":
      return validateIntegerRange(
        command.level,
        TRAINER_COMMAND_LIMITS.resistanceLevel.min,
        TRAINER_COMMAND_LIMITS.resistanceLevel.max,
        "setResistance.level"
      )
    case "setSimulationGrade": {
      const gradeResult = validateFiniteRange(
        command.gradePercent,
        TRAINER_COMMAND_LIMITS.simulationGradePercent.min,
        TRAINER_COMMAND_LIMITS.simulationGradePercent.max,
        "setSimulationGrade.gradePercent"
      )
      if (!gradeResult.ok) return gradeResult
      if (command.windSpeedMps === undefined) return { ok: true }
      return validateFiniteRange(
        command.windSpeedMps,
        TRAINER_COMMAND_LIMITS.windSpeedMps.min,
        TRAINER_COMMAND_LIMITS.windSpeedMps.max,
        "setSimulationGrade.windSpeedMps"
      )
    }
    case "setMode":
      if (!VALID_MODES.includes(command.mode)) {
        return { ok: false, reason: "setMode.mode:invalid-value" }
      }
      return { ok: true }
    case "requestCalibration":
    case "disconnect":
      return { ok: true }
    default: {
      const _exhaustive: never = command
      return { ok: false, reason: `unknown-command-type:${(_exhaustive as TrainerCommand).type}` }
    }
  }
}

export type ClampResult =
  | { ok: true; value: number }
  | { ok: false; reason: string }

export function clampTargetPowerWatts(watts: number): ClampResult {
  if (!Number.isFinite(watts)) {
    return { ok: false, reason: "must-be-finite" }
  }
  return {
    ok: true,
    value: clampInteger(
      watts,
      TRAINER_COMMAND_LIMITS.targetPowerWatts.min,
      TRAINER_COMMAND_LIMITS.targetPowerWatts.max
    ),
  }
}

function validateIntegerRange(
  value: number,
  min: number,
  max: number,
  label: string
): CommandValidationSuccess | CommandValidationFailure {
  if (!Number.isFinite(value)) {
    return { ok: false, reason: `${label}:must-be-finite` }
  }
  if (!Number.isInteger(value)) {
    return { ok: false, reason: `${label}:must-be-integer` }
  }
  if (value < min || value > max) {
    return { ok: false, reason: `${label}:out-of-range` }
  }
  return { ok: true }
}

function validateFiniteRange(
  value: number,
  min: number,
  max: number,
  label: string
): CommandValidationSuccess | CommandValidationFailure {
  if (!Number.isFinite(value)) {
    return { ok: false, reason: `${label}:must-be-finite` }
  }
  if (value < min || value > max) {
    return { ok: false, reason: `${label}:out-of-range` }
  }
  return { ok: true }
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.max(min, Math.min(max, Math.round(value)))
}
