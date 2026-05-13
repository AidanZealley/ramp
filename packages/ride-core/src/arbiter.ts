import { Capability, Subject, commandCapability } from "@ramp/ride-contracts"
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
  attempts: number
  nextAttemptAt: number
  completion: CommandCompletion | null
}

type CommandCompletion = {
  promise: Promise<void>
  resolve: () => void
  reject: (error: Error) => void
  settled: boolean
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
  ):
    | { accepted: true; acknowledged: Promise<void> | null }
    | { accepted: false; reason: string } {
    const key = this.keyFor(command)
    const current = this.pending.get(key)
    if (
      current &&
      this.policy.precedence[current.source] > this.policy.precedence[source]
    ) {
      return { accepted: false, reason: "command-superseded" }
    }
    const now = this.now()
    this.settlePending(current, "command-superseded")
    const completion =
      options.delivery === "acknowledged" ? createCompletion() : null
    this.pending.set(key, {
      command,
      source,
      requestedAt: now,
      priority: options.priority ?? "normal",
      attempts: 0,
      nextAttemptAt: now,
      completion,
    })
    return { accepted: true, acknowledged: completion?.promise ?? null }
  }

  clear(options: { clearLastSent?: boolean; reason?: string } = {}): void {
    const reason = options.reason ?? "commands-cleared"
    for (const pending of this.pending.values()) {
      this.settlePending(pending, reason)
    }
    if (this.inFlight) {
      this.settlePending(this.inFlight.pending, reason)
    }
    this.pending.clear()
    this.inFlight = null
    if (options.clearLastSent ?? false) {
      this.lastSentAt.clear()
    }
  }

  async flush(
    trainer: RideTrainerAdapter | null
  ): Promise<
    { sent: true; key: CommandKey; command: TrainerCommand } | { sent: false }
  > {
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
      this.resolvePending(pending)
      this.lastSentAt.set(key, now)
      return { sent: true, key, command: pending.command }
    } catch (error: unknown) {
      // Handle retry with backoff
      const currentPending = this.pending.get(key)
      if (currentPending === pending) {
        const newAttempts = pending.attempts + 1
        if (newAttempts >= MAX_ATTEMPTS) {
          // Max retries reached, drop and emit error
          this.pending.delete(key)
          const reason =
            error instanceof Error
              ? error.message
              : "command-rejected:max-retries"
          this.rejectPending(pending, reason)
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

  private settlePending(pending: Pending | undefined, reason: string): void {
    if (!pending) return
    this.rejectPending(pending, reason)
  }

  private resolvePending(pending: Pending): void {
    const completion = pending.completion
    if (!completion || completion.settled) return
    completion.settled = true
    completion.resolve()
  }

  private rejectPending(pending: Pending, reason: string): void {
    const completion = pending.completion
    if (!completion || completion.settled) return
    completion.settled = true
    completion.reject(new Error(reason))
  }
}

function createCompletion(): CommandCompletion {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject, settled: false }
}

function isCapabilityKey(key: CommandKey): key is Capability {
  return Object.values(Capability).includes(key as Capability)
}
