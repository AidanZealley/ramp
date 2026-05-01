import { Capability } from "@ramp/ride-contracts"
import type { TrainerCapabilities } from "../../../types"
import type { FtmsFeatureSupport, FtmsSupportedRange } from "./types"

const FEATURE_FLAG_SPEED = 1 << 0
const FEATURE_FLAG_CADENCE = 1 << 1
const FEATURE_FLAG_HEART_RATE = 1 << 10
const FEATURE_FLAG_POWER = 1 << 14

const TARGET_FLAG_RESISTANCE = 1 << 2
const TARGET_FLAG_POWER = 1 << 3
const TARGET_FLAG_SIMULATION = 1 << 13
const TARGET_FLAG_SPIN_DOWN = 1 << 15

export function decodeFitnessMachineFeature(
  view: DataView
): FtmsFeatureSupport {
  const featureFlags = view.getUint32(0, true)
  const targetFlags = view.getUint32(4, true)

  return {
    readings: {
      speed: (featureFlags & FEATURE_FLAG_SPEED) !== 0,
      cadence: (featureFlags & FEATURE_FLAG_CADENCE) !== 0,
      power: (featureFlags & FEATURE_FLAG_POWER) !== 0,
      heartRate: (featureFlags & FEATURE_FLAG_HEART_RATE) !== 0,
    },
    targets: {
      resistance: (targetFlags & TARGET_FLAG_RESISTANCE) !== 0,
      power: (targetFlags & TARGET_FLAG_POWER) !== 0,
      simulation: (targetFlags & TARGET_FLAG_SIMULATION) !== 0,
      spinDown: (targetFlags & TARGET_FLAG_SPIN_DOWN) !== 0,
    },
  }
}

export function deriveTrainerCapabilities(input: {
  feature: FtmsFeatureSupport | null
  supportedPowerRange: FtmsSupportedRange | null
  supportedResistanceRange: FtmsSupportedRange | null
}): TrainerCapabilities {
  const capabilities = new Set<Capability>()
  const feature = input.feature
  if (!feature) return capabilities

  if (feature.readings.speed) capabilities.add(Capability.ReadSpeed)
  if (feature.readings.cadence) capabilities.add(Capability.ReadCadence)
  if (feature.readings.power) capabilities.add(Capability.ReadPower)
  if (feature.readings.heartRate) capabilities.add(Capability.ReadHeartRate)

  if (
    feature.targets.power &&
    input.supportedPowerRange &&
    input.supportedPowerRange.increment > 0
  ) {
    capabilities.add(Capability.TargetPower)
  }
  if (
    feature.targets.resistance &&
    input.supportedResistanceRange &&
    input.supportedResistanceRange.increment > 0
  ) {
    capabilities.add(Capability.Resistance)
  }
  if (feature.targets.simulation) {
    capabilities.add(Capability.SimulationGrade)
  }
  if (feature.targets.spinDown) {
    capabilities.add(Capability.Calibration)
  }

  return capabilities
}
