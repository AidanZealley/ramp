import {
  Capability,
  commandCapability,
} from "@ramp/ride-contracts"
import type { Capability as CapabilityName } from "@ramp/ride-contracts"
import type {
  DispatchResult,
  TrainerCapabilities,
  TrainerCommand,
  TrainerCommandSource,
} from "./types"

export { commandCapability }

export type ArbitrationPolicy = {
  precedence: Record<TrainerCommandSource, number>
  coalesceMs: Partial<Record<CapabilityName, number>>
  alwaysAllow: ReadonlyArray<TrainerCommand["type"]>
}

export const defaultPolicy: ArbitrationPolicy = {
  precedence: { system: 100, user: 75, workout: 50, experience: 25 },
  coalesceMs: {
    [Capability.SimulationGrade]: 200,
    [Capability.TargetPower]: 50,
    [Capability.Resistance]: 100,
  },
  alwaysAllow: ["disconnect", "requestCalibration"],
}

export function enforce(
  command: TrainerCommand,
  _source: TrainerCommandSource,
  policy: ArbitrationPolicy,
  capabilities: TrainerCapabilities
): DispatchResult {
  // Source precedence is applied by CommandArbiter; enforcement only checks
  // always-allowed commands and trainer capability support.
  if (policy.alwaysAllow.includes(command.type)) return { ok: true }
  if (command.type === "setMode") return { ok: true }

  const capability = commandCapability(command)
  if (capability && !capabilities.has(capability)) {
    return { ok: false, reason: "capability-unsupported" }
  }

  return { ok: true }
}
