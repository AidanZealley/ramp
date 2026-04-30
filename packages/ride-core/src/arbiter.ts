import { Capability } from "@ramp/ride-contracts"
import { commandCapability } from "./policy"
import type { ArbitrationPolicy } from "./policy"
import type {
  DispatchOptions,
  RideTrainerAdapter,
  TrainerCommand,
  TrainerCommandSource,
} from "./types"

type CommandKey = Capability | "mode" | "disconnect"

type Pending = {
  command: TrainerCommand
  source: TrainerCommandSource
  requestedAt: number
  priority: NonNullable<DispatchOptions["priority"]>
}

export class CommandArbiter {
  private readonly pending = new Map<CommandKey, Pending>()
  private readonly lastSentAt = new Map<CommandKey, number>()
  private readonly inFlight = new Set<CommandKey>()

  constructor(
    private readonly policy: ArbitrationPolicy,
    private readonly now: () => number
  ) {}

  enqueue(
    command: TrainerCommand,
    source: TrainerCommandSource,
    options: DispatchOptions = {}
  ): void {
    const key = this.keyFor(command)
    const current = this.pending.get(key)
    if (
      current &&
      this.policy.precedence[current.source] > this.policy.precedence[source]
    ) {
      return
    }
    this.pending.set(key, {
      command,
      source,
      requestedAt: this.now(),
      priority: options.priority ?? "normal",
    })
  }

  async flush(trainer: RideTrainerAdapter | null): Promise<void> {
    if (!trainer) return
    const now = this.now()
    const entries = Array.from(this.pending.entries())
    const errors: Array<unknown> = []

    for (const [key, pending] of entries) {
      if (this.inFlight.has(key)) continue
      const coalesceMs = isCapabilityKey(key)
        ? (this.policy.coalesceMs[key] ?? 0)
        : 0
      const lastSentAt = this.lastSentAt.get(key) ?? -Infinity
      const firstSend = lastSentAt === -Infinity

      if (!firstSend && now - lastSentAt < coalesceMs) continue
      if (
        pending.priority !== "immediate" &&
        firstSend &&
        coalesceMs > 0 &&
        now - pending.requestedAt < coalesceMs
      ) {
        continue
      }

      this.inFlight.add(key)
      try {
        await trainer.sendCommand(pending.command)
        if (this.pending.get(key) === pending) this.pending.delete(key)
        this.lastSentAt.set(key, now)
      } catch (error: unknown) {
        errors.push(error)
      } finally {
        this.inFlight.delete(key)
      }
    }

    if (errors.length === 1) throw errors[0]
    if (errors.length > 1) {
      throw new AggregateError(errors, "Multiple trainer commands failed")
    }
  }

  private keyFor(command: TrainerCommand): CommandKey {
    if (command.type === "disconnect") return "disconnect"
    if (command.type === "setMode") return "mode"
    return commandCapability(command) ?? "mode"
  }
}

function isCapabilityKey(key: CommandKey): key is Capability {
  return Object.values(Capability).includes(key as Capability)
}
