import type { PhysicsState, PhysicsStepInput, PhysicsStepResult } from "./types"

const GRAVITY_MPS2 = 9.80665

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function createInitialPhysicsState(): PhysicsState {
  return {
    speedMps: 0,
    smoothedPowerWatts: 0,
  }
}

export function stepPhysics(input: PhysicsStepInput): PhysicsStepResult {
  const { config, state } = input
  const deltaSeconds = clamp(input.deltaSeconds, 0, 0.25)
  const powerWatts = Math.max(0, input.powerWatts)
  const smoothingSeconds = Math.max(0.001, config.powerSmoothingSeconds)
  const alpha = 1 - Math.exp(-deltaSeconds / smoothingSeconds)
  const smoothedPowerWatts =
    state.smoothedPowerWatts +
    (powerWatts - state.smoothedPowerWatts) * alpha

  const massKg = config.riderWeightKg + config.bikeWeightKg
  const effectiveMassKg = massKg * config.inertiaMultiplier
  const theta = Math.atan(input.gradePercent / 100)
  const currentSpeed = clamp(state.speedMps, 0, config.maxDescentSpeedMps)
  const effectiveSpeed = Math.max(currentSpeed, config.minEffectiveSpeedMps)
  const wheelPowerWatts = smoothedPowerWatts * config.drivetrainEfficiency
  const driveForce = wheelPowerWatts / effectiveSpeed
  const gravityForce = massKg * GRAVITY_MPS2 * Math.sin(theta)
  const rollingResistanceForce =
    massKg * GRAVITY_MPS2 * config.crr * Math.cos(theta)
  const aerodynamicDragForce =
    0.5 *
    config.airDensityKgPerM3 *
    config.cda *
    currentSpeed *
    currentSpeed
  const netForce =
    driveForce - gravityForce - rollingResistanceForce - aerodynamicDragForce
  const acceleration = netForce / effectiveMassKg
  const nextSpeed = clamp(
    currentSpeed + acceleration * deltaSeconds,
    0,
    config.maxDescentSpeedMps
  )
  const distanceDeltaMeters = ((currentSpeed + nextSpeed) / 2) * deltaSeconds

  return {
    state: {
      speedMps: nextSpeed,
      smoothedPowerWatts,
    },
    distanceDeltaMeters,
    speedMps: nextSpeed,
  }
}
