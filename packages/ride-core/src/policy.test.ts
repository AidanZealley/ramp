import { describe, expect, it } from "vitest"
import { Capability } from "@ramp/ride-contracts"
import { defaultPolicy, enforce } from "./policy"

describe("ride-core policy", () => {
  it("rejects unsupported write capabilities", () => {
    expect(
      enforce(
        { type: "setTargetPower", watts: 200 },
        "user",
        defaultPolicy,
        new Set([Capability.ReadPower])
      )
    ).toEqual({ ok: false, reason: "capability-unsupported" })
  })

  it.each([
    { type: "disconnect" },
    { type: "requestCalibration" },
    { type: "setMode", mode: "erg" },
  ] as const)("allows %s without write capabilities", (command) => {
    expect(enforce(command, "user", defaultPolicy, new Set())).toEqual({
      ok: true,
    })
  })

  it.each([
    [
      { type: "setTargetPower", watts: 200 },
      new Set([Capability.TargetPower]),
    ],
    [{ type: "setResistance", level: 20 }, new Set([Capability.Resistance])],
    [
      { type: "setSimulationGrade", gradePercent: 2 },
      new Set([Capability.SimulationGrade]),
    ],
  ] as const)("allows supported write command %s", (command, capabilities) => {
    expect(enforce(command, "user", defaultPolicy, capabilities)).toEqual({
      ok: true,
    })
  })
})
