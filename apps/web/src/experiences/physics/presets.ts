import type { PhysicsConfig } from "./types"

export const INDOOR_LIKE_PHYSICS_PRESET = {
  presetId: "indoor-like",
  cda: 0.32,
  crr: 0.004,
  drivetrainEfficiency: 0.975,
  airDensityKgPerM3: 1.225,
  maxDescentSpeedMps: 22.22,
  powerSmoothingSeconds: 3,
  inertiaMultiplier: 1.15,
  minEffectiveSpeedMps: 0.75,
} satisfies Omit<PhysicsConfig, "riderWeightKg" | "bikeWeightKg">

export function createIndoorLikePhysicsConfig(input: {
  riderWeightKg: number
  bikeWeightKg: number
}): PhysicsConfig {
  return {
    ...INDOOR_LIKE_PHYSICS_PRESET,
    riderWeightKg: input.riderWeightKg,
    bikeWeightKg: input.bikeWeightKg,
  }
}
