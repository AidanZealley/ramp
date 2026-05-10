import { Subject } from "@ramp/ride-contracts"
import type {
  SimulatedRiderCommand,
  SimulatedRiderState,
} from "./simulation-types"

export type SimulatedRiderOptions = {
  initial?: Partial<SimulatedRiderState>
  rampWattsPerSecond?: number
}

export class SimulatedRider {
  private readonly stateSubject = new Subject<SimulatedRiderState>()
  private readonly rampWattsPerSecond: number
  private stateValue: SimulatedRiderState

  constructor(options: SimulatedRiderOptions = {}) {
    this.rampWattsPerSecond = options.rampWattsPerSecond ?? 90
    this.stateValue = {
      powerWatts: options.initial?.powerWatts ?? 180,
      cadenceRpm: options.initial?.cadenceRpm ?? 85,
      heartRateBpm: options.initial?.heartRateBpm ?? null,
      paused: options.initial?.paused ?? false,
      powerMode: options.initial?.powerMode ?? "manual",
    }
  }

  get state(): SimulatedRiderState {
    return { ...this.stateValue }
  }

  dispatch(command: SimulatedRiderCommand): void {
    if (command.type === "setManualPower") {
      this.update({
        powerWatts: clamp(Math.round(command.watts), 0, 700),
        powerMode: "manual",
      })
      return
    }
    if (command.type === "setCadence") {
      this.update({ cadenceRpm: clamp(Math.round(command.rpm), 40, 130) })
      return
    }
    if (command.type === "setHeartRate") {
      this.update({
        heartRateBpm:
          command.bpm == null ? null : clamp(Math.round(command.bpm), 30, 240),
      })
      return
    }
    if (command.type === "setPaused") {
      this.update({ paused: command.paused })
      return
    }
    this.update({ powerMode: command.mode })
  }

  followErgTarget(targetPowerWatts: number | null, elapsedMs: number): void {
    if (this.stateValue.powerMode !== "erg-auto" || targetPowerWatts == null) {
      return
    }
    const target = clamp(Math.round(targetPowerWatts), 0, 700)
    const maxStep = (this.rampWattsPerSecond * elapsedMs) / 1000
    const delta = target - this.stateValue.powerWatts
    const nextPower =
      Math.abs(delta) <= maxStep
        ? target
        : this.stateValue.powerWatts + Math.sign(delta) * maxStep
    this.update({ powerWatts: Math.round(nextPower) })
  }

  subscribeState(listener: (state: SimulatedRiderState) => void): () => void {
    return this.stateSubject.subscribe(listener)
  }

  private update(patch: Partial<SimulatedRiderState>): void {
    this.stateValue = { ...this.stateValue, ...patch }
    this.stateSubject.emit(this.state)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
