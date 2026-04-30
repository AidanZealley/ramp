import { CommandArbiter } from "./arbiter"
import {  defaultPolicy, enforce } from "./policy"
import type {ArbitrationPolicy} from "./policy";
import type { TrainerControlAPI } from "./controls"
import type {
  DispatchResult,
  RideSessionController,
  RideSessionState,
  RideTrainerAdapter,
  TrainerCapabilities,
} from "./types"

export type CreateRideSessionOptions = {
  now?: () => number
  tickIntervalMs?: number
  telemetryIntervalMs?: number
  flushIntervalMs?: number
  policy?: ArbitrationPolicy
}

const emptyCapabilities: TrainerCapabilities = new Set()

export function createRideSession(
  options: CreateRideSessionOptions = {}
): RideSessionController {
  const now = options.now ?? (() => Date.now())
  const telemetryIntervalMs =
    options.telemetryIntervalMs ?? options.tickIntervalMs ?? 100
  const flushIntervalMs = options.flushIntervalMs ?? 50
  const policy = options.policy ?? defaultPolicy
  const listeners = new Set<() => void>()
  const arbiter = new CommandArbiter(policy, now)
  let trainer: RideTrainerAdapter | null = null
  let telemetryTimer: ReturnType<typeof setInterval> | null = null
  let flushTimer: ReturnType<typeof setInterval> | null = null
  let cleanup: Array<() => void> = []
  let lastTickMs = now()
  let connectionGeneration = 0
  let latestTelemetry = {
    powerWatts: null as number | null,
    cadenceRpm: null as number | null,
    speedMps: null as number | null,
    heartRateBpm: null as number | null,
  }
  let state: RideSessionState = {
    telemetry: {
      elapsedSeconds: 0,
      distanceMeters: 0,
      speedMps: null,
      powerWatts: null,
      cadenceRpm: null,
      heartRateBpm: null,
      trainerStatus: "disconnected",
    },
    trainerConnected: false,
    paused: false,
    activeControlMode: "manual",
    lastError: null,
  }

  const notify = () => {
    for (const listener of listeners) listener()
  }

  const setState = (
    next:
      | RideSessionState
      | ((previous: RideSessionState) => RideSessionState)
  ) => {
    const previous = state
    state = typeof next === "function" ? next(previous) : next
    if (state === previous) return
    notify()
  }

  const telemetryEqual = (
    previous: RideSessionState["telemetry"],
    next: RideSessionState["telemetry"]
  ) =>
    previous.elapsedSeconds === next.elapsedSeconds &&
    previous.distanceMeters === next.distanceMeters &&
    previous.speedMps === next.speedMps &&
    previous.powerWatts === next.powerWatts &&
    previous.cadenceRpm === next.cadenceRpm &&
    previous.heartRateBpm === next.heartRateBpm &&
    previous.trainerStatus === next.trainerStatus

  const startTimers = () => {
    if (!telemetryTimer) {
      telemetryTimer = setInterval(tickTelemetry, telemetryIntervalMs)
    }
    if (!flushTimer) {
      flushTimer = setInterval(flushCommands, flushIntervalMs)
    }
  }

  const stopTimers = () => {
    if (telemetryTimer) {
      clearInterval(telemetryTimer)
      telemetryTimer = null
    }
    if (flushTimer) {
      clearInterval(flushTimer)
      flushTimer = null
    }
  }

  const tickTelemetry = () => {
    if (state.paused) {
      lastTickMs = now()
      return
    }
    const current = now()
    const deltaSeconds = Math.max(0, (current - lastTickMs) / 1000)
    lastTickMs = current
    const speedMps = latestTelemetry.speedMps
    setState((previous) => {
      const nextTelemetry = {
        ...previous.telemetry,
        elapsedSeconds: previous.telemetry.elapsedSeconds + deltaSeconds,
        distanceMeters:
          previous.telemetry.distanceMeters + deltaSeconds * (speedMps ?? 0),
        speedMps,
        powerWatts: latestTelemetry.powerWatts,
        cadenceRpm: latestTelemetry.cadenceRpm,
        heartRateBpm: latestTelemetry.heartRateBpm,
      }
      if (telemetryEqual(previous.telemetry, nextTelemetry)) return previous
      return { ...previous, telemetry: nextTelemetry }
    })
  }

  const flushCommands = () => {
    void arbiter.flush(trainer).catch((error: unknown) => {
      setState((previous) => ({
        ...previous,
        lastError: error instanceof Error ? error.message : String(error),
        telemetry: { ...previous.telemetry, trainerStatus: "error" },
      }))
    })
  }

  const resetLatestTelemetry = () => {
    latestTelemetry = {
      powerWatts: null,
      cadenceRpm: null,
      speedMps: null,
      heartRateBpm: null,
    }
  }

  const setLatestTelemetry = (telemetry: typeof latestTelemetry) => {
    latestTelemetry = telemetry
  }

  const controls: TrainerControlAPI = {
    async dispatch(command, source, dispatchOptions): Promise<DispatchResult> {
      const result = enforce(
        command,
        source,
        policy,
        trainer?.capabilities ?? emptyCapabilities
      )
      if (!result.ok) return result

      if (command.type === "disconnect") {
        await controller.disconnectTrainer()
        return { ok: true }
      }

      if (command.type === "setMode") {
        setState((previous) => ({
          ...previous,
          activeControlMode:
            command.mode === "erg"
              ? "workout"
              : command.mode === "free"
                ? "manual"
                : "experience",
        }))
      }

      arbiter.enqueue(command, source, dispatchOptions)
      return { ok: true }
    },
    getCapabilities() {
      return trainer?.capabilities ?? emptyCapabilities
    },
  }

  const controller: RideSessionController = {
    getState() {
      return state
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    async connectTrainer(nextTrainer) {
      if (trainer) await controller.disconnectTrainer()
      const generation = ++connectionGeneration
      trainer = nextTrainer
      setState((previous) => ({
        ...previous,
        telemetry: { ...previous.telemetry, trainerStatus: "connecting" },
      }))
      cleanup = [
        nextTrainer.subscribeTelemetry((telemetry) => {
          setLatestTelemetry({
            powerWatts: telemetry.powerWatts,
            cadenceRpm: telemetry.cadenceRpm,
            speedMps: telemetry.speedMps,
            heartRateBpm: telemetry.heartRateBpm,
          })
        }),
        nextTrainer.subscribeState((connectionState) => {
          const ready = connectionState.kind === "connected"
          setState((previous) => ({
            ...previous,
            trainerConnected: ready,
            telemetry: {
              ...previous.telemetry,
              trainerStatus:
                connectionState.kind === "error"
                  ? "error"
                  : ready
                    ? "ready"
                    : connectionState.kind === "connecting"
                      ? "connecting"
                      : "disconnected",
            },
            lastError:
              connectionState.kind === "error"
                ? connectionState.error.message
                : previous.lastError,
          }))
        }),
        nextTrainer.subscribeError((error) => {
          setState((previous) => ({
            ...previous,
            lastError: error.message,
            telemetry: { ...previous.telemetry, trainerStatus: "error" },
          }))
        }),
      ]
      await nextTrainer.connect()
      if (generation !== connectionGeneration || trainer !== nextTrainer) return
      lastTickMs = now()
      startTimers()
    },
    async disconnectTrainer() {
      connectionGeneration += 1
      stopTimers()
      for (const dispose of cleanup) dispose()
      cleanup = []
      await trainer?.disconnect()
      trainer = null
      resetLatestTelemetry()
      setState((previous) => ({
        ...previous,
        trainerConnected: false,
        telemetry: { ...previous.telemetry, trainerStatus: "disconnected" },
      }))
    },
    pause() {
      setState((previous) => ({ ...previous, paused: true }))
    },
    resume() {
      lastTickMs = now()
      setState((previous) => ({ ...previous, paused: false }))
    },
    controls,
  }

  return controller
}
