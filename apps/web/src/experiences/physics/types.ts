export type PhysicsPresetId = "indoor-like"

export type PhysicsConfig = {
  presetId: PhysicsPresetId
  riderWeightKg: number
  bikeWeightKg: number
  cda: number
  crr: number
  drivetrainEfficiency: number
  airDensityKgPerM3: number
  maxDescentSpeedMps: number
  powerSmoothingSeconds: number
  inertiaMultiplier: number
  minEffectiveSpeedMps: number
}

export type PhysicsState = {
  speedMps: number
  smoothedPowerWatts: number
}

export type PhysicsStepInput = {
  state: PhysicsState
  powerWatts: number
  gradePercent: number
  deltaSeconds: number
  config: PhysicsConfig
}

export type PhysicsStepResult = {
  state: PhysicsState
  distanceDeltaMeters: number
  speedMps: number
}
