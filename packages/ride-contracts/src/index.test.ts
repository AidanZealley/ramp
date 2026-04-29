import { describe, expect, it } from "vitest"
import { Capability, type TrainerCommand } from "./index"

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
})
