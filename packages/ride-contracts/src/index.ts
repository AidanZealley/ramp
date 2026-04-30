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
  | "unknown"

export type TrainerError = {
  code: TrainerErrorCode
  message: string
  cause?: unknown
}

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
    case "requestCalibration":
    case "disconnect":
      return { ok: true }
  }
}

export function clampTargetPowerWatts(watts: number): number {
  return clampInteger(
    watts,
    TRAINER_COMMAND_LIMITS.targetPowerWatts.min,
    TRAINER_COMMAND_LIMITS.targetPowerWatts.max
  )
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
