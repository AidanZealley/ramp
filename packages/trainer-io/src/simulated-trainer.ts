import {
  Capability,
  Subject,
  commandCapability,
  validateTrainerCommand,
} from "@ramp/ride-contracts"
import { SimulatedRider } from "./simulated-rider"
import type { SimulatedTrainerState } from "./simulation-types"
import type {
  TrainerCapabilities,
  TrainerCommand,
  TrainerConnectionState,
  TrainerError,
  TrainerSource,
  TrainerTelemetryMessage,
} from "./types"

export type SimulatedTrainerOptions = {
  intervalMs?: number
  connectDelayMs?: number
  now?: () => number
  capabilities?: TrainerCapabilities
  rider?: SimulatedRider
}

export class SimulatedTrainer implements TrainerSource {
  readonly kind = "simulated" as const
  readonly rider: SimulatedRider
  private readonly capabilitiesView: TrainerCapabilities
  private readonly mutableCapabilities: Set<Capability>
  private readonly telemetrySubject = new Subject<TrainerTelemetryMessage>()
  private readonly connectionSubject = new Subject<TrainerConnectionState>()
  private readonly errorSubject = new Subject<TrainerError>()
  private readonly trainerStateSubject = new Subject<SimulatedTrainerState>()
  private readonly intervalMs: number
  private readonly connectDelayMs: number
  private readonly now: () => number
  private timer: ReturnType<typeof setInterval> | null = null
  private connectPromise: Promise<void> | null = null
  private connectPromiseGeneration: number | null = null
  private connectGeneration = 0
  private lastTickMs: number | null = null
  state: TrainerConnectionState = { kind: "disconnected" }
  private simulatorState: SimulatedTrainerState = {
    mode: "free",
    targetPowerWatts: null,
    resistanceLevel: null,
    gradePercent: 0,
    windSpeedMps: 0,
    connected: false,
    currentPowerWatts: null,
    currentCadenceRpm: null,
    currentSpeedMps: null,
  }

  constructor(options: SimulatedTrainerOptions = {}) {
    this.intervalMs = options.intervalMs ?? 100
    this.connectDelayMs = options.connectDelayMs ?? 0
    this.now = options.now ?? (() => Date.now())
    this.rider = options.rider ?? new SimulatedRider()
    this.mutableCapabilities = new Set(
      options.capabilities ??
        new Set([
          Capability.ReadPower,
          Capability.ReadCadence,
          Capability.ReadSpeed,
          Capability.ReadHeartRate,
          Capability.TargetPower,
          Capability.Resistance,
          Capability.SimulationGrade,
        ])
    )
    this.capabilitiesView = new Set(this.mutableCapabilities)
  }

  get capabilities(): TrainerCapabilities {
    return new Set(this.capabilitiesView)
  }

  get simulator(): SimulatedTrainerState {
    return { ...this.simulatorState }
  }

  connect(): Promise<void> {
    if (this.state.kind === "connected" && this.timer) {
      return Promise.resolve()
    }
    if (
      this.connectPromise &&
      this.connectPromiseGeneration === this.connectGeneration
    ) {
      return this.connectPromise
    }
    const generation = ++this.connectGeneration
    const connectPromise = this.doConnect(generation).finally(() => {
      if (this.connectPromise === connectPromise) {
        this.connectPromise = null
        this.connectPromiseGeneration = null
      }
    })
    this.connectPromise = connectPromise
    this.connectPromiseGeneration = generation
    return connectPromise
  }

  disconnect(): Promise<void> {
    this.connectGeneration += 1
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.lastTickMs = null
    this.setSimulatorState({
      connected: false,
      currentPowerWatts: null,
      currentCadenceRpm: null,
      currentSpeedMps: null,
    })
    this.setConnectionState({ kind: "disconnected" })
    return Promise.resolve()
  }

  async sendCommand(command: TrainerCommand): Promise<void> {
    if (this.state.kind !== "connected" && command.type !== "disconnect") {
      throw this.emitError({
        code: "transport",
        message: "Trainer is not connected.",
      })
    }

    const validation = validateTrainerCommand(command)
    if (!validation.ok) {
      throw this.emitError({ code: "validation", message: validation.reason })
    }

    const capability = commandCapability(command)
    if (capability && !this.mutableCapabilities.has(capability)) {
      throw this.emitError({
        code: "command-rejected",
        message: `Unsupported command: ${command.type}`,
      })
    }

    if (command.type === "disconnect") {
      await this.disconnect()
      return
    }
    if (command.type === "setMode") {
      this.setSimulatorState({
        mode: command.mode,
        targetPowerWatts:
          command.mode === "free" ? null : this.simulatorState.targetPowerWatts,
      })
      this.rider.dispatch({
        type: "setPowerMode",
        mode: command.mode === "erg" ? "erg-auto" : "manual",
      })
    }
    if (command.type === "setTargetPower") {
      this.setSimulatorState({ targetPowerWatts: command.watts, mode: "erg" })
      if (this.rider.state.powerMode !== "manual") {
        this.rider.dispatch({ type: "setPowerMode", mode: "erg-auto" })
      }
    }
    if (command.type === "setSimulationGrade") {
      this.setSimulatorState({
        gradePercent: command.gradePercent,
        windSpeedMps: command.windSpeedMps ?? this.simulatorState.windSpeedMps,
      })
    }
    if (command.type === "setResistance") {
      this.setSimulatorState({ resistanceLevel: command.level })
    }
    this.emitTelemetry()
  }

  subscribeTelemetry(
    listener: (telemetry: TrainerTelemetryMessage) => void
  ): () => void {
    return this.telemetrySubject.subscribe(listener)
  }

  subscribeState(
    listener: (state: TrainerConnectionState) => void
  ): () => void {
    return this.connectionSubject.subscribe(listener)
  }

  subscribeError(listener: (error: TrainerError) => void): () => void {
    return this.errorSubject.subscribe(listener)
  }

  subscribeSimulatorState(
    listener: (state: SimulatedTrainerState) => void
  ): () => void {
    return this.trainerStateSubject.subscribe(listener)
  }

  private async doConnect(generation: number): Promise<void> {
    if (this.timer) return
    this.setConnectionState({ kind: "connecting" })
    if (this.connectDelayMs > 0) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, this.connectDelayMs)
      )
    } else {
      await Promise.resolve()
    }
    if (generation !== this.connectGeneration) return
    this.setConnectionState({ kind: "connected" })
    this.setSimulatorState({ connected: true })
    this.emitTelemetry()
    this.timer = setInterval(() => this.emitTelemetry(), this.intervalMs)
  }

  private emitTelemetry(): void {
    const now = this.now()
    const elapsedMs =
      this.lastTickMs == null ? this.intervalMs : now - this.lastTickMs
    this.lastTickMs = now
    this.rider.followErgTarget(this.simulatorState.targetPowerWatts, elapsedMs)
    const rider = this.rider.state
    const powerWatts = rider.paused ? 0 : rider.powerWatts
    const cadenceRpm = rider.cadenceRpm
    const speedMps = rider.paused
      ? 0
      : computeSpeedMps({
          powerWatts,
          cadenceRpm,
          gradePercent: this.simulatorState.gradePercent,
          resistanceLevel: this.simulatorState.resistanceLevel,
          windSpeedMps: this.simulatorState.windSpeedMps,
        })
    this.setSimulatorState({
      currentPowerWatts: powerWatts,
      currentCadenceRpm: cadenceRpm,
      currentSpeedMps: speedMps,
    })
    this.telemetrySubject.emit({
      powerWatts,
      cadenceRpm,
      speedMps,
      heartRateBpm: rider.heartRateBpm,
      timestampMs: now,
      source: this.kind,
    })
  }

  private setConnectionState(state: TrainerConnectionState): void {
    this.state = state
    this.connectionSubject.emit(state)
  }

  private setSimulatorState(patch: Partial<SimulatedTrainerState>): void {
    this.simulatorState = { ...this.simulatorState, ...patch }
    this.trainerStateSubject.emit(this.simulator)
  }

  private emitError(error: TrainerError): TrainerError {
    this.errorSubject.emit(error)
    return error
  }
}

function computeSpeedMps(input: {
  powerWatts: number
  cadenceRpm: number
  gradePercent: number
  resistanceLevel: number | null
  windSpeedMps: number
}): number {
  const base = 2.2 + input.powerWatts * 0.033 + (input.cadenceRpm - 85) * 0.014
  const gradeFactor =
    input.gradePercent >= 0
      ? 1 / (1 + input.gradePercent * 0.12)
      : 1 + Math.abs(input.gradePercent) * 0.035
  const windFactor = 1 / (1 + Math.max(0, input.windSpeedMps) * 0.045)
  const resistanceFactor =
    input.resistanceLevel == null ? 1 : 1 / (1 + input.resistanceLevel * 0.01)
  return clamp(base * gradeFactor * windFactor * resistanceFactor, 0, 18)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
