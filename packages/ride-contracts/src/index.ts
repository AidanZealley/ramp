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
