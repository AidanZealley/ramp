import {
  Capability,
  Subject,
  commandCapability,
  validateTrainerCommand,
} from "@ramp/ride-contracts"
import type {
  TrainerCapabilities,
  TrainerCommand,
  TrainerConnectionState,
  TrainerError,
  TrainerSource,
  TrainerTelemetryMessage,
} from "./types"

export type MockTrainerOptions = {
  intervalMs?: number
  connectDelayMs?: number
  initial?: Partial<TrainerTelemetryMessage>
  now?: () => number
  basePowerToSpeed?: number
  capabilities?: TrainerCapabilities
}

export class MockTrainer implements TrainerSource {
  readonly kind = "mock"
  private readonly capabilitiesView: TrainerCapabilities
  private readonly mutableCapabilities: Set<Capability>
  private readonly telemetrySubject = new Subject<TrainerTelemetryMessage>()
  private readonly stateSubject = new Subject<TrainerConnectionState>()
  private readonly errorSubject = new Subject<TrainerError>()
  private readonly intervalMs: number
  private readonly connectDelayMs: number
  private readonly now: () => number
  private readonly basePowerToSpeed: number
  private timer: ReturnType<typeof setInterval> | null = null
  private connectPromise: Promise<void> | null = null
  private manualPowerWatts: number
  private ergTargetWatts: number | null = null
  private gradePercent = 0
  private connectGeneration = 0
  state: TrainerConnectionState = { kind: "disconnected" }

  constructor(options: MockTrainerOptions = {}) {
    const intervalMs = options.intervalMs ?? 100
    const connectDelayMs = options.connectDelayMs ?? 0
    if (!Number.isFinite(intervalMs) || intervalMs < 1) {
      throw new Error("intervalMs must be a finite number >= 1")
    }
    if (!Number.isFinite(connectDelayMs) || connectDelayMs < 0) {
      throw new Error("connectDelayMs must be a finite number >= 0")
    }
    this.intervalMs = intervalMs
    this.connectDelayMs = connectDelayMs
    this.now = options.now ?? (() => Date.now())
    this.basePowerToSpeed = options.basePowerToSpeed ?? 0.035
    this.manualPowerWatts = options.initial?.powerWatts ?? 180
    this.mutableCapabilities = new Set(
      options.capabilities ?? Object.values(Capability)
    )
    this.capabilitiesView = new Set(this.mutableCapabilities)
  }

  get capabilities(): TrainerCapabilities {
    return new Set(this.capabilitiesView)
  }

  connect(): Promise<void> {
    if (this.connectPromise) return this.connectPromise
    this.connectPromise = this.doConnect().finally(() => {
      this.connectPromise = null
    })
    return this.connectPromise
  }

  private async doConnect(): Promise<void> {
    if (this.timer) return
    const generation = ++this.connectGeneration
    this.setState({ kind: "connecting" })
    if (this.connectDelayMs > 0) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, this.connectDelayMs)
      )
    } else {
      await Promise.resolve()
    }
    if (generation !== this.connectGeneration) return
    this.setState({ kind: "connected" })
    this.emitTelemetry()
    this.timer = setInterval(() => this.emitTelemetry(), this.intervalMs)
  }

  disconnect(): Promise<void> {
    this.connectGeneration += 1
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.setState({ kind: "disconnected" })
    return Promise.resolve()
  }

  async sendCommand(command: TrainerCommand): Promise<void> {
    if (this.state.kind !== "connected") {
      const error: TrainerError = {
        code: "transport",
        message: "Trainer is not connected.",
      }
      this.errorSubject.emit(error)
      throw error
    }

    const validation = validateTrainerCommand(command)
    if (!validation.ok) {
      const error: TrainerError = {
        code: "validation",
        message: validation.reason,
      }
      this.errorSubject.emit(error)
      throw error
    }

    const capability = commandCapability(command)
    if (capability && !this.mutableCapabilities.has(capability)) {
      const error: TrainerError = {
        code: "command-rejected",
        message: `Unsupported command: ${command.type}`,
      }
      this.errorSubject.emit(error)
      throw error
    }

    if (command.type === "setTargetPower") this.ergTargetWatts = command.watts
    if (command.type === "setSimulationGrade") {
      this.gradePercent = command.gradePercent
    }
    if (command.type === "setMode" && command.mode === "free") {
      this.ergTargetWatts = null
    }
    if (command.type === "disconnect") await this.disconnect()
  }

  subscribeTelemetry(
    listener: (t: TrainerTelemetryMessage) => void
  ): () => void {
    return this.telemetrySubject.subscribe(listener)
  }

  subscribeState(listener: (s: TrainerConnectionState) => void): () => void {
    return this.stateSubject.subscribe(listener)
  }

  subscribeError(listener: (e: TrainerError) => void): () => void {
    return this.errorSubject.subscribe(listener)
  }

  private emitTelemetry(): void {
    const powerWatts = this.ergTargetWatts ?? this.manualPowerWatts
    // Derive cadence from power using a simple linear model so telemetry
    // responds naturally to power target changes without a mock-only API.
    const cadenceRpm = deriveCadenceFromPower(powerWatts)
    const speedMps = computeSpeedMps({
      powerWatts,
      cadenceRpm,
      basePowerToSpeed: this.basePowerToSpeed,
      gradePercent: this.gradePercent,
    })
    this.telemetrySubject.emit({
      powerWatts,
      cadenceRpm,
      speedMps,
      heartRateBpm: null,
      timestampMs: this.now(),
      source: this.kind,
    })
  }

  private setState(state: TrainerConnectionState): void {
    this.state = state
    this.stateSubject.emit(state)
  }
}

function computeSpeedMps(input: {
  powerWatts: number
  cadenceRpm: number
  basePowerToSpeed: number
  gradePercent: number
}): number {
  const base =
    2.5 +
    input.powerWatts * input.basePowerToSpeed +
    (input.cadenceRpm - 85) * 0.015
  const gradePenalty = Math.max(0.35, 1 - input.gradePercent * 0.055)
  return clamp(base * gradePenalty, 2.5, 16)
}

/**
 * Derive a realistic cadence from power output.
 * Simple linear model: base cadence of 75 rpm, +-0.08 rpm per watt above/below 100W.
 * Clamped to [40, 120] rpm.
 */
function deriveCadenceFromPower(powerWatts: number): number {
  return clamp(75 + (powerWatts - 100) * 0.08, 40, 120)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
