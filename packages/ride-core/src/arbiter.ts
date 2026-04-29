import type {
  Capability,
  RideTrainerAdapter,
  TrainerCommand,
  TrainerCommandSource,
} from "./types"
import { type ArbitrationPolicy, commandCapability } from "./policy"

type Pending = {
  command: TrainerCommand
  source: TrainerCommandSource
  requestedAt: number
}

export class CommandArbiter {
  private readonly pending = new Map<Capability | "mode" | "disconnect", Pending>()
  private readonly lastSentAt = new Map<Capability | "mode" | "disconnect", number>()

  constructor(
    private readonly policy: ArbitrationPolicy,
    private readonly now: () => number
  ) {}

  enqueue(command: TrainerCommand, source: TrainerCommandSource): void {
    const key = this.keyFor(command)
    const current = this.pending.get(key)
    if (
      current &&
      this.policy.precedence[current.source] > this.policy.precedence[source]
    ) {
      return
    }
    this.pending.set(key, { command, source, requestedAt: this.now() })
  }

  async flush(trainer: RideTrainerAdapter | null): Promise<void> {
    if (!trainer) return
    const now = this.now()
    const entries = Array.from(this.pending.entries())

    for (const [key, pending] of entries) {
      const capabilityKey = typeof key === "string" ? null : key
      const coalesceMs = capabilityKey
        ? (this.policy.coalesceMs[capabilityKey] ?? 0)
        : 0
      const lastSentAt = this.lastSentAt.get(key) ?? -Infinity
      const firstSend = lastSentAt === -Infinity

      if (!firstSend && now - lastSentAt < coalesceMs) continue
      if (firstSend && coalesceMs > 0 && now - pending.requestedAt < coalesceMs) {
        continue
      }

      this.pending.delete(key)
      await trainer.sendCommand(pending.command)
      this.lastSentAt.set(key, now)
    }
  }

  private keyFor(command: TrainerCommand): Capability | "mode" | "disconnect" {
    if (command.type === "disconnect") return "disconnect"
    if (command.type === "setMode") return "mode"
    return commandCapability(command) ?? "mode"
  }
}
