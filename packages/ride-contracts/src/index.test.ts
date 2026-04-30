import { describe, expect, it } from "vitest"
import {
  Capability,
  clampTargetPowerWatts,
  type TrainerCommand,
  TRAINER_COMMAND_LIMITS,
  validateTrainerCommand,
} from "./index"

describe("ride-contracts", () => {
  it("exports the canonical capability values", () => {
    expect(Capability.TargetPower).toBe("write.targetPower")
    expect(Capability.SimulationGrade).toBe("write.simulationGrade")
  })

  it("accepts trainer command union assignments", () => {
    const command: TrainerCommand = {
      type: "setSimulationGrade",
      gradePercent: 6,
      windSpeedMps: 2,
    }

    expect(command.type).toBe("setSimulationGrade")
  })

  it("validates command bounds and numeric safety", () => {
    expect(
      validateTrainerCommand({ type: "setTargetPower", watts: 200.5 })
    ).toEqual({
      ok: false,
      reason: "setTargetPower.watts:must-be-integer",
    })
    expect(
      validateTrainerCommand({
        type: "setSimulationGrade",
        gradePercent: Number.POSITIVE_INFINITY,
      })
    ).toEqual({
      ok: false,
      reason: "setSimulationGrade.gradePercent:must-be-finite",
    })
    expect(
      validateTrainerCommand({ type: "setResistance", level: 101 })
    ).toEqual({
      ok: false,
      reason: "setResistance.level:out-of-range",
    })
    expect(
      validateTrainerCommand({ type: "setTargetPower", watts: 250 })
    ).toEqual({ ok: true })
  })

  it("clamps target power to the declared shared range", () => {
    expect(clampTargetPowerWatts(-50)).toBe(
      TRAINER_COMMAND_LIMITS.targetPowerWatts.min
    )
    expect(clampTargetPowerWatts(9999)).toBe(
      TRAINER_COMMAND_LIMITS.targetPowerWatts.max
    )
  })
})
