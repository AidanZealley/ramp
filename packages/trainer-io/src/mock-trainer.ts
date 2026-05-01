import {
  Capability,
  validateTrainerCommand,
  type TrainerCapabilities,
  type TrainerCommand,
} from "@ramp/ride-contracts"
import { Subject } from "./observable"
import type {
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
  readonly capabilities: TrainerCapabilities
  private readonly telemetrySubject = new Subject<TrainerTelemetryMessage>()
  private readonly stateSubject = new Subject<TrainerConnectionState>()
  private readonly errorSubject = new Subject<TrainerError>()
  private readonly intervalMs: number
  private readonly connectDelayMs: number
  private readonly now: () => number
  private readonly basePowerToSpeed: number
  private timer: ReturnType<typeof setInterval> | null = null
  private manualPowerWatts: number
  private manualCadenceRpm: number
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
    this.manualCadenceRpm = options.initial?.cadenceRpm ?? 90
    this.capabilities =
      options.capabilities ?? new Set(Object.values(Capability))
  }

  async connect(): Promise<void> {
    if (this.timer || this.state.kind === "connecting") return
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
    if (capability && !this.capabilities.has(capability)) {
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

  setManualOverrides(input: {
    powerWatts?: number
    cadenceRpm?: number
  }): void {
    if (input.powerWatts !== undefined && !Number.isFinite(input.powerWatts)) {
      throw new Error("powerWatts must be a finite number")
    }
    if (input.cadenceRpm !== undefined && !Number.isFinite(input.cadenceRpm)) {
      throw new Error("cadenceRpm must be a finite number")
    }
    this.manualPowerWatts = input.powerWatts ?? this.manualPowerWatts
    this.manualCadenceRpm = input.cadenceRpm ?? this.manualCadenceRpm
    this.emitTelemetry()
  }

  private emitTelemetry(): void {
    const powerWatts = this.ergTargetWatts ?? this.manualPowerWatts
    const speedMps = computeSpeedMps({
      powerWatts,
      cadenceRpm: this.manualCadenceRpm,
      basePowerToSpeed: this.basePowerToSpeed,
      gradePercent: this.gradePercent,
    })
    this.telemetrySubject.emit({
      powerWatts,
      cadenceRpm: this.manualCadenceRpm,
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

function commandCapability(command: TrainerCommand): Capability | null {
  if (command.type === "setTargetPower") return Capability.TargetPower
  if (command.type === "setResistance") return Capability.Resistance
  if (command.type === "setSimulationGrade") return Capability.SimulationGrade
  if (command.type === "requestCalibration") return Capability.Calibration
  return null
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
