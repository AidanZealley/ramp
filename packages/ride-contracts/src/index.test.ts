import { afterEach, describe, expect, it, vi } from "vitest"
import {
  Capability,
  Subject,
  TRAINER_COMMAND_LIMITS,
  clampTargetPowerWatts,
  commandCapability,
  isTrainerError,
  toTrainerError,
  validateTrainerCommand,
} from "./index"
import type { TrainerCommand, TrainerError } from "./index"

describe("ride-contracts", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    [{ type: "setTargetPower", watts: 200 }, Capability.TargetPower],
    [{ type: "setResistance", level: 20 }, Capability.Resistance],
    [
      { type: "setSimulationGrade", gradePercent: 3 },
      Capability.SimulationGrade,
    ],
    [{ type: "requestCalibration" }, Capability.Calibration],
    [{ type: "setMode", mode: "erg" }, null],
    [{ type: "disconnect" }, null],
  ] satisfies Array<[TrainerCommand, Capability | null]>)(
    "maps %s to its required capability",
    (command, capability) => {
      expect(commandCapability(command)).toBe(capability)
    }
  )

  it.each([
    [{ type: "setTargetPower", watts: 0 }, { ok: true }],
    [{ type: "setTargetPower", watts: 2500 }, { ok: true }],
    [
      { type: "setTargetPower", watts: -1 },
      { ok: false, reason: "setTargetPower.watts:out-of-range" },
    ],
    [
      { type: "setTargetPower", watts: 2501 },
      { ok: false, reason: "setTargetPower.watts:out-of-range" },
    ],
    [
      { type: "setTargetPower", watts: 200.5 },
      { ok: false, reason: "setTargetPower.watts:must-be-integer" },
    ],
    [
      { type: "setTargetPower", watts: Number.NaN },
      { ok: false, reason: "setTargetPower.watts:must-be-finite" },
    ],
    [{ type: "setResistance", level: 0 }, { ok: true }],
    [{ type: "setResistance", level: 100 }, { ok: true }],
    [
      { type: "setResistance", level: -1 },
      { ok: false, reason: "setResistance.level:out-of-range" },
    ],
    [
      { type: "setResistance", level: 101 },
      { ok: false, reason: "setResistance.level:out-of-range" },
    ],
    [
      { type: "setResistance", level: 20.5 },
      { ok: false, reason: "setResistance.level:must-be-integer" },
    ],
  ] satisfies Array<
    [TrainerCommand, ReturnType<typeof validateTrainerCommand>]
  >)("validates integer command %s", (command, result) => {
    expect(validateTrainerCommand(command)).toEqual(result)
  })

  it.each([
    [{ gradePercent: -25 }, { ok: true }],
    [{ gradePercent: 25 }, { ok: true }],
    [
      { gradePercent: -26 },
      { ok: false, reason: "setSimulationGrade.gradePercent:out-of-range" },
    ],
    [
      { gradePercent: 26 },
      { ok: false, reason: "setSimulationGrade.gradePercent:out-of-range" },
    ],
    [
      { gradePercent: Number.POSITIVE_INFINITY },
      { ok: false, reason: "setSimulationGrade.gradePercent:must-be-finite" },
    ],
    [{ gradePercent: 0, windSpeedMps: undefined }, { ok: true }],
    [{ gradePercent: 0, windSpeedMps: -20 }, { ok: true }],
    [{ gradePercent: 0, windSpeedMps: 20 }, { ok: true }],
    [
      { gradePercent: 0, windSpeedMps: -21 },
      { ok: false, reason: "setSimulationGrade.windSpeedMps:out-of-range" },
    ],
    [
      { gradePercent: 0, windSpeedMps: 21 },
      { ok: false, reason: "setSimulationGrade.windSpeedMps:out-of-range" },
    ],
    [
      { gradePercent: 0, windSpeedMps: Number.NaN },
      { ok: false, reason: "setSimulationGrade.windSpeedMps:must-be-finite" },
    ],
  ] satisfies Array<
    [
      Omit<Extract<TrainerCommand, { type: "setSimulationGrade" }>, "type">,
      ReturnType<typeof validateTrainerCommand>,
    ]
  >)("validates simulation grade %s", (input, result) => {
    expect(
      validateTrainerCommand({ type: "setSimulationGrade", ...input })
    ).toEqual(result)
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
    expect(clampTargetPowerWatts(199.6)).toEqual({ ok: true, value: 200 })
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

  it("recognizes cancelled trainer errors", () => {
    const error: TrainerError = {
      code: "cancelled",
      message: "Bluetooth trainer selection was cancelled.",
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

  it("converts unknown values to trainer errors", () => {
    const error = new Error("boom")
    expect(toTrainerError(error)).toEqual({
      code: "unknown",
      message: "boom",
      cause: error,
    })
    expect(toTrainerError("boom")).toEqual({
      code: "unknown",
      message: "boom",
      cause: "boom",
    })

    const fallback: TrainerError = {
      code: "permission",
      message: "Selection cancelled.",
    }

    expect(toTrainerError(new Error("cancelled"), fallback)).toBe(fallback)
  })

  it("emits subject values in order and supports unsubscribe and clear", () => {
    const subject = new Subject<number>()
    const values: Array<string> = []
    const unsubscribeA = subject.subscribe((value) => values.push(`a:${value}`))
    subject.subscribe((value) => values.push(`b:${value}`))

    subject.emit(1)
    unsubscribeA()
    subject.emit(2)
    subject.clear()
    subject.emit(3)

    expect(values).toEqual(["a:1", "b:1", "b:2"])
  })

  it("continues subject emission after a listener throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    const subject = new Subject<number>()
    const listener = vi.fn()
    subject.subscribe(() => {
      throw new Error("listener failed")
    })
    subject.subscribe(listener)

    subject.emit(1)

    expect(console.error).toHaveBeenCalledWith(
      "Subject listener threw",
      expect.any(Error)
    )
    expect(listener).toHaveBeenCalledWith(1)
  })
})
