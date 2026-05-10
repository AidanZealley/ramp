export type RiderPowerMode = "manual" | "erg-auto"

export type SimulatedRiderState = {
  powerWatts: number
  cadenceRpm: number
  heartRateBpm: number | null
  paused: boolean
  powerMode: RiderPowerMode
}

export type SimulatedRiderCommand =
  | { type: "setManualPower"; watts: number }
  | { type: "setCadence"; rpm: number }
  | { type: "setHeartRate"; bpm: number | null }
  | { type: "setPaused"; paused: boolean }
  | { type: "setPowerMode"; mode: RiderPowerMode }

export type SimulatedTrainerMode = "free" | "erg" | "simulation" | "resistance"

export type SimulatedTrainerState = {
  mode: SimulatedTrainerMode
  targetPowerWatts: number | null
  resistanceLevel: number | null
  gradePercent: number
  windSpeedMps: number
  connected: boolean
  currentPowerWatts: number | null
  currentCadenceRpm: number | null
  currentSpeedMps: number | null
}
