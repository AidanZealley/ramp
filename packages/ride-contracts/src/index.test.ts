import { describe, expect, it } from "vitest"
import {
  Capability,
  TRAINER_COMMAND_LIMITS,
  clampTargetPowerWatts,
  isTrainerError,
  toTrainerError,
  validateTrainerCommand,
} from "./index"
import type { TrainerCommand, TrainerError } from "./index"

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
    const underResult = clampTargetPowerWatts(-50)
    expect(underResult).toEqual({
      ok: true,
      value: TRAINER_COMMAND_LIMITS.targetPowerWatts.min,
    })

    const overResult = clampTargetPowerWatts(9999)
    expect(overResult).toEqual({
      ok: true,
      value: TRAINER_COMMAND_LIMITS.targetPowerWatts.max,
    })
  })

  it("rejects non-finite values in clampTargetPowerWatts", () => {
    expect(clampTargetPowerWatts(Number.NaN)).toEqual({
      ok: false,
      reason: "must-be-finite",
    })
    expect(clampTargetPowerWatts(Number.POSITIVE_INFINITY)).toEqual({
      ok: false,
      reason: "must-be-finite",
    })
  })

  it("validates setMode against allowed values", () => {
    expect(validateTrainerCommand({ type: "setMode", mode: "erg" })).toEqual({
      ok: true,
    })
    expect(validateTrainerCommand({ type: "setMode", mode: "free" })).toEqual({
      ok: true,
    })
    // Test invalid mode by casting to bypass TypeScript
    expect(
      validateTrainerCommand({
        type: "setMode",
        mode: "invalid" as "erg",
      })
    ).toEqual({
      ok: false,
      reason: "setMode.mode:invalid-value",
    })
  })

  it("recognizes valid trainer error objects", () => {
    const error: TrainerError = {
      code: "transport",
      message: "Transport failed.",
    }

    expect(isTrainerError(error)).toBe(true)
    expect(toTrainerError(error)).toBe(error)
  })

  it("rejects missing trainer error fields", () => {
    expect(isTrainerError({ code: "transport" })).toBe(false)
    expect(isTrainerError({ message: "Transport failed." })).toBe(false)
    expect(isTrainerError({ code: 1, message: "Transport failed." })).toBe(
      false
    )
    expect(isTrainerError({ code: "transport", message: null })).toBe(false)
  })

  it("rejects null and primitive trainer error values", () => {
    expect(isTrainerError(null)).toBe(false)
    expect(isTrainerError(undefined)).toBe(false)
    expect(isTrainerError("transport")).toBe(false)
    expect(isTrainerError(1)).toBe(false)
    expect(isTrainerError(false)).toBe(false)
  })

  it("converts unknown values to a fallback trainer error", () => {
    const fallback: TrainerError = {
      code: "permission",
      message: "Selection cancelled.",
    }

    expect(toTrainerError(new Error("cancelled"), fallback)).toBe(fallback)
  })
})
