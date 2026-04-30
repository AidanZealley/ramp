import { CommandArbiter } from "./arbiter"
import type { TrainerControlAPI } from "./controls"
import { type ArbitrationPolicy, defaultPolicy, enforce } from "./policy"
import type {
  DispatchResult,
  RideSessionController,
  RideSessionState,
  TrainerCapabilities,
  RideTrainerAdapter,
} from "./types"

export type CreateRideSessionOptions = {
  now?: () => number
  tickIntervalMs?: number
  policy?: ArbitrationPolicy
}

const emptyCapabilities: TrainerCapabilities = new Set()

export function createRideSession(
  options: CreateRideSessionOptions = {}
): RideSessionController {
  const now = options.now ?? (() => Date.now())
  const tickIntervalMs = options.tickIntervalMs ?? 100
  const policy = options.policy ?? defaultPolicy
  const listeners = new Set<() => void>()
  const arbiter = new CommandArbiter(policy, now)
  let trainer: RideTrainerAdapter | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let cleanup: Array<() => void> = []
  let lastTickMs = now()
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

  const setState = (next: RideSessionState) => {
    state = next
    notify()
  }

  const tick = () => {
    if (!state.paused) {
      const current = now()
      const deltaSeconds = Math.max(0, (current - lastTickMs) / 1000)
      lastTickMs = current
      const speedMps = latestTelemetry.speedMps
      state = {
        ...state,
        telemetry: {
          ...state.telemetry,
          elapsedSeconds: state.telemetry.elapsedSeconds + deltaSeconds,
          distanceMeters:
            state.telemetry.distanceMeters + deltaSeconds * (speedMps ?? 0),
          speedMps,
          powerWatts: latestTelemetry.powerWatts,
          cadenceRpm: latestTelemetry.cadenceRpm,
          heartRateBpm: latestTelemetry.heartRateBpm,
        },
      }
      notify()
    } else {
      lastTickMs = now()
    }

    void arbiter.flush(trainer).catch((error: unknown) => {
      setState({
        ...state,
        lastError: error instanceof Error ? error.message : String(error),
        telemetry: { ...state.telemetry, trainerStatus: "error" },
      })
    })
  }

  const controls: TrainerControlAPI = {
    async dispatch(command, source): Promise<DispatchResult> {
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
        state = {
          ...state,
          activeControlMode:
            command.mode === "erg"
              ? "workout"
              : command.mode === "free"
                ? "manual"
                : "experience",
        }
        notify()
      }

      arbiter.enqueue(command, source)
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
      trainer = nextTrainer
      setState({
        ...state,
        telemetry: { ...state.telemetry, trainerStatus: "connecting" },
      })
      cleanup = [
        nextTrainer.subscribeTelemetry((telemetry) => {
          latestTelemetry = {
            powerWatts: telemetry.powerWatts,
            cadenceRpm: telemetry.cadenceRpm,
            speedMps: telemetry.speedMps,
            heartRateBpm: telemetry.heartRateBpm,
          }
        }),
        nextTrainer.subscribeState((connectionState) => {
          const ready = connectionState.kind === "connected"
          setState({
            ...state,
            trainerConnected: ready,
            telemetry: {
              ...state.telemetry,
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
                : state.lastError,
          })
        }),
        nextTrainer.subscribeError((error) => {
          setState({
            ...state,
            lastError: error.message,
            telemetry: { ...state.telemetry, trainerStatus: "error" },
          })
        }),
      ]
      await nextTrainer.connect()
      lastTickMs = now()
      if (!timer) timer = setInterval(tick, tickIntervalMs)
      setState({
        ...state,
        trainerConnected: true,
        telemetry: { ...state.telemetry, trainerStatus: "ready" },
      })
    },
    async disconnectTrainer() {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      for (const dispose of cleanup) dispose()
      cleanup = []
      await trainer?.disconnect()
      trainer = null
      latestTelemetry = {
        powerWatts: null,
        cadenceRpm: null,
        speedMps: null,
        heartRateBpm: null,
      }
      setState({
        ...state,
        trainerConnected: false,
        telemetry: { ...state.telemetry, trainerStatus: "disconnected" },
      })
    },
    pause() {
      setState({ ...state, paused: true })
    },
    resume() {
      lastTickMs = now()
      setState({ ...state, paused: false })
    },
    controls,
  }

  return controller
}
