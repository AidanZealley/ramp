import { Capability } from "@ramp/ride-contracts"
import { describe, expect, it } from "vitest"
import {
  decodeFitnessMachineFeature,
  deriveTrainerCapabilities,
} from "./fitness-machine-feature"

describe("decodeFitnessMachineFeature", () => {
  it("derives capabilities from feature and range support", () => {
    const bytes = new Uint8Array(8)
    const view = new DataView(bytes.buffer)
    view.setUint32(0, (1 << 0) | (1 << 1) | (1 << 10) | (1 << 14), true)
    view.setUint32(4, (1 << 2) | (1 << 3) | (1 << 13) | (1 << 15), true)

    const feature = decodeFitnessMachineFeature(view)
    const capabilities = deriveTrainerCapabilities({
      feature,
      supportedPowerRange: { min: 0, max: 4000, increment: 1 },
      supportedResistanceRange: { min: 0, max: 100, increment: 0.5 },
    })

    expect(capabilities).toEqual(
      new Set([
        Capability.ReadSpeed,
        Capability.ReadCadence,
        Capability.ReadPower,
        Capability.ReadHeartRate,
        Capability.TargetPower,
        Capability.Resistance,
        Capability.SimulationGrade,
        Capability.Calibration,
      ])
    )
  })

  it("withholds write capabilities when the supported range is absent", () => {
    const bytes = new Uint8Array(8)
    const view = new DataView(bytes.buffer)
    view.setUint32(4, (1 << 2) | (1 << 3), true)

    const capabilities = deriveTrainerCapabilities({
      feature: decodeFitnessMachineFeature(view),
      supportedPowerRange: null,
      supportedResistanceRange: null,
    })

    expect(capabilities.has(Capability.TargetPower)).toBe(false)
    expect(capabilities.has(Capability.Resistance)).toBe(false)
  })
})
