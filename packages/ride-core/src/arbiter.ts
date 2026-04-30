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
  private inFlight: { key: CommandKey; pending: Pending } | null = null

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

  clear(options: { clearLastSent?: boolean } = {}): void {
    this.pending.clear()
    this.inFlight = null
    if (options.clearLastSent ?? false) {
      this.lastSentAt.clear()
    }
  }

  async flush(trainer: RideTrainerAdapter | null): Promise<void> {
    if (!trainer || this.inFlight) return
    const now = this.now()
    const nextEntry = this.nextSendableEntry(now)
    if (!nextEntry) return

    const [key, pending] = nextEntry
    this.inFlight = { key, pending }
    try {
      await trainer.sendCommand(pending.command)
      if (this.pending.get(key) === pending) {
        this.pending.delete(key)
      }
      this.lastSentAt.set(key, now)
    } finally {
      this.inFlight = null
    }
  }

  private nextSendableEntry(now: number): [CommandKey, Pending] | null {
    const entries = Array.from(this.pending.entries()).filter(
      ([key, pending]) => this.isSendable(key, pending, now)
    )
    if (entries.length === 0) return null

    entries.sort((left, right) => {
      const [, leftPending] = left
      const [, rightPending] = right
      if (leftPending.priority !== rightPending.priority) {
        return leftPending.priority === "immediate" ? -1 : 1
      }
      const precedenceDelta =
        this.policy.precedence[rightPending.source] -
        this.policy.precedence[leftPending.source]
      if (precedenceDelta !== 0) return precedenceDelta
      return leftPending.requestedAt - rightPending.requestedAt
    })

    return entries[0] ?? null
  }

  private isSendable(key: CommandKey, pending: Pending, now: number): boolean {
    const coalesceMs = isCapabilityKey(key)
      ? (this.policy.coalesceMs[key] ?? 0)
      : 0
    const lastSentAt = this.lastSentAt.get(key) ?? -Infinity
    const firstSend = lastSentAt === -Infinity

    if (!firstSend && now - lastSentAt < coalesceMs) return false
    if (
      pending.priority !== "immediate" &&
      firstSend &&
      coalesceMs > 0 &&
      now - pending.requestedAt < coalesceMs
    ) {
      return false
    }
    return true
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
