import { Capability } from "@ramp/ride-contracts"
import { commandCapability } from "./policy"
import type { ArbitrationPolicy } from "./policy"
import type {
  DispatchOptions,
  RideTrainerAdapter,
  TrainerCommand,
  TrainerCommandSource,
} from "./types"

// Simple Subject implementation for error events
class Subject<T> {
  private readonly listeners = new Set<(value: T) => void>()

  subscribe(listener: (value: T) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(value: T): void {
    for (const listener of this.listeners) {
      try {
        listener(value)
      } catch (err) {
        console.error("Arbiter error listener threw", err)
      }
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}

type CommandKey = Capability | "mode" | "disconnect"

type Pending = {
  command: TrainerCommand
  source: TrainerCommandSource
  requestedAt: number
  priority: NonNullable<DispatchOptions["priority"]>
  attempts: number
  nextAttemptAt: number
}

export type ArbiterError = {
  key: CommandKey
  command: TrainerCommand
  reason: string
}

const MAX_ATTEMPTS = 6
const MAX_BACKOFF_MS = 2000

function backoffFor(attempts: number): number {
  const base = Math.min(MAX_BACKOFF_MS, 100 * Math.pow(2, attempts - 1))
  const jitter = Math.random() * 50
  return base + jitter
}

export class CommandArbiter {
  private readonly pending = new Map<CommandKey, Pending>()
  private readonly lastSentAt = new Map<CommandKey, number>()
  private inFlight: { key: CommandKey; pending: Pending } | null = null
  readonly errors = new Subject<ArbiterError>()

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
    const now = this.now()
    this.pending.set(key, {
      command,
      source,
      requestedAt: now,
      priority: options.priority ?? "normal",
      attempts: 0,
      nextAttemptAt: now,
    })
  }

  clear(options: { clearLastSent?: boolean } = {}): void {
    this.pending.clear()
    this.inFlight = null
    if (options.clearLastSent ?? false) {
      this.lastSentAt.clear()
    }
  }

  async flush(
    trainer: RideTrainerAdapter | null
  ): Promise<{ sent: true; key: CommandKey } | { sent: false }> {
    if (!trainer || this.inFlight) return { sent: false }
    const now = this.now()
    const nextEntry = this.nextSendableEntry(now)
    if (!nextEntry) return { sent: false }

    const [key, pending] = nextEntry
    this.inFlight = { key, pending }
    try {
      await trainer.sendCommand(pending.command)
      if (this.pending.get(key) === pending) {
        this.pending.delete(key)
      }
      this.lastSentAt.set(key, now)
      return { sent: true, key }
    } catch (error: unknown) {
      // Handle retry with backoff
      const currentPending = this.pending.get(key)
      if (currentPending === pending) {
        const newAttempts = pending.attempts + 1
        if (newAttempts >= MAX_ATTEMPTS) {
          // Max retries reached, drop and emit error
          this.pending.delete(key)
          const reason =
            error instanceof Error ? error.message : "command-rejected:max-retries"
          this.errors.emit({ key, command: pending.command, reason })
        } else {
          // Schedule retry with backoff
          this.pending.set(key, {
            ...pending,
            attempts: newAttempts,
            nextAttemptAt: this.now() + backoffFor(newAttempts),
          })
        }
      }
      throw error
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
    // Must wait for backoff delay
    if (now < pending.nextAttemptAt) return false

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
