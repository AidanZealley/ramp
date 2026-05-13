import { Subject, validateTrainerCommand } from "@ramp/ride-contracts"
import { CommandArbiter } from "./arbiter"
import { defaultPolicy, enforce } from "./policy"
import type { ArbitrationPolicy } from "./policy"
import type { TrainerError, TrainerTelemetry } from "@ramp/ride-contracts"
import type { TrainerControlAPI } from "./controls"
import type {
  DispatchResult,
  RideFrameData,
  RideSessionController,
  RideSessionState,
  RideTelemetry,
  RideTrainerAdapter,
  RideTrainerTelemetry,
  TrainerCapabilitiesView,
} from "./types"

export type CreateRideSessionOptions = {
  now?: () => number
  tickIntervalMs?: number
  telemetryIntervalMs?: number
  flushIntervalMs?: number
  telemetryStaleAfterMs?: number
  connectTimeoutMs?: number
  policy?: ArbitrationPolicy
  /** Injectable rAF for testing; defaults to globalThis.requestAnimationFrame */
  requestAnimationFrame?: (callback: (timestamp: number) => void) => number
  /** Injectable cAF for testing; defaults to globalThis.cancelAnimationFrame */
  cancelAnimationFrame?: (handle: number) => void
}

const emptyCapabilities: TrainerCapabilitiesView = new Set()

type LatestTelemetry = TrainerTelemetry | null

const initialTelemetry = (): RideTelemetry => ({
  elapsedSeconds: 0,
  distanceMeters: 0,
  speedMps: null,
  powerWatts: null,
  cadenceRpm: null,
  heartRateBpm: null,
  trainerStatus: "disconnected",
  telemetryStatus: "missing",
  lastTelemetryAtMs: null,
  telemetryAgeMs: null,
  telemetrySource: null,
})

export function createRideSession(
  options: CreateRideSessionOptions = {}
): RideSessionController {
  const now = options.now ?? (() => Date.now())
  const telemetryIntervalMs =
    options.telemetryIntervalMs ?? options.tickIntervalMs ?? 100
  const flushIntervalMs = options.flushIntervalMs ?? 50
  const telemetryStaleAfterMs = options.telemetryStaleAfterMs ?? 2000
  const connectTimeoutMs = options.connectTimeoutMs ?? 20_000
  const policy = options.policy ?? defaultPolicy
  const raf =
    options.requestAnimationFrame ??
    ((cb: (ts: number) => void) => globalThis.requestAnimationFrame(cb))
  const caf =
    options.cancelAnimationFrame ??
    ((id: number) => globalThis.cancelAnimationFrame(id))
  const listeners = new Set<() => void>()
  const arbiter = new CommandArbiter(policy, now)
  const frameSubject = new Subject<RideFrameData>()
  let trainer: RideTrainerAdapter | null = null
  let rafHandle: number | null = null
  let rafLastTickMs = 0
  let flushTimer: ReturnType<typeof setInterval> | null = null
  let cleanup: Array<() => void> = []
  let lastTickMs = now()
  let connectionGeneration = 0
  let latestTelemetry: LatestTelemetry = null
  let state: RideSessionState = {
    telemetry: initialTelemetry(),
    trainerConnected: false,
    paused: false,
    activeControlMode: "manual",
    lastError: null,
    lastTrainerError: null,
  }
  let disposed = false

  const notify = () => {
    for (const listener of listeners) {
      try {
        listener()
      } catch (err) {
        console.error("RideSession listener threw", err)
      }
    }
  }

  const setState = (
    next: RideSessionState | ((previous: RideSessionState) => RideSessionState)
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
    previous.trainerStatus === next.trainerStatus &&
    previous.telemetryStatus === next.telemetryStatus &&
    previous.lastTelemetryAtMs === next.lastTelemetryAtMs &&
    previous.telemetryAgeMs === next.telemetryAgeMs &&
    previous.telemetrySource === next.telemetrySource

  // rAF-driven tick loop — runs at display frame rate, fires tickTelemetry
  // at telemetryIntervalMs cadence. Compares wall-clock (now()) so the timing
  // is consistent regardless of whether the rAF timestamp origin matches now().
  const rafLoop = (_timestamp: number) => {
    if (disposed) return
    const current = now()
    if (!state.paused && current - rafLastTickMs >= telemetryIntervalMs) {
      rafLastTickMs = current
      tickTelemetry()
    }
    rafHandle = raf(rafLoop)
  }

  const startTimers = () => {
    if (rafHandle === null) {
      // Seed so the first tick fires after one full interval
      rafLastTickMs = now()
      rafHandle = raf(rafLoop)
    }
    // flushCommands must keep running in background tabs, so keep setInterval
    if (!flushTimer) {
      flushTimer = setInterval(flushCommands, flushIntervalMs)
    }
  }

  const stopTimers = () => {
    if (rafHandle !== null) {
      caf(rafHandle)
      rafHandle = null
    }
    if (flushTimer) {
      clearInterval(flushTimer)
      flushTimer = null
    }
  }

  const resetLatestTelemetry = () => {
    latestTelemetry = null
  }

  const setLatestTelemetry = (telemetry: TrainerTelemetry) => {
    latestTelemetry = telemetry
  }

  const clearSubscriptions = () => {
    for (const dispose of cleanup) dispose()
    cleanup = []
  }

  const resetArbiter = (clearLastSent = true) => {
    arbiter.clear({ clearLastSent, reason: "commands-cleared" })
  }

  const resetConnectionState = ({
    trainerStatus,
    trainerConnected,
    lastError,
    lastTrainerError,
  }: {
    trainerStatus: RideTelemetry["trainerStatus"]
    trainerConnected: boolean
    lastError: string | null
    lastTrainerError: TrainerError | null
  }) => {
    setState((previous) => ({
      ...previous,
      trainerConnected,
      activeControlMode: trainerConnected
        ? previous.activeControlMode
        : "manual",
      lastError,
      lastTrainerError,
      telemetry: {
        ...previous.telemetry,
        speedMps: null,
        powerWatts: null,
        cadenceRpm: null,
        heartRateBpm: null,
        trainerStatus,
        telemetryStatus: "missing",
        lastTelemetryAtMs: null,
        telemetryAgeMs: null,
        telemetrySource: null,
      },
    }))
  }

  const tickTelemetry = () => {
    if (state.paused) {
      lastTickMs = now()
      return
    }

    const current = now()
    const deltaSeconds = Math.max(0, (current - lastTickMs) / 1000)
    lastTickMs = current

    setState((previous) => {
      const ageMs =
        latestTelemetry === null
          ? null
          : Math.max(0, current - latestTelemetry.timestampMs)
      const telemetryStatus =
        latestTelemetry === null
          ? "missing"
          : ageMs !== null && ageMs <= telemetryStaleAfterMs
            ? "fresh"
            : "stale"
      const speedMps = latestTelemetry?.speedMps ?? previous.telemetry.speedMps
      const advancesProgress = telemetryStatus === "fresh"
      const nextTelemetry: RideTelemetry = {
        ...previous.telemetry,
        elapsedSeconds: advancesProgress
          ? previous.telemetry.elapsedSeconds + deltaSeconds
          : previous.telemetry.elapsedSeconds,
        distanceMeters: advancesProgress
          ? previous.telemetry.distanceMeters + deltaSeconds * (speedMps ?? 0)
          : previous.telemetry.distanceMeters,
        speedMps,
        powerWatts:
          latestTelemetry?.powerWatts ?? previous.telemetry.powerWatts,
        cadenceRpm:
          latestTelemetry?.cadenceRpm ?? previous.telemetry.cadenceRpm,
        heartRateBpm:
          latestTelemetry?.heartRateBpm ?? previous.telemetry.heartRateBpm,
        telemetryStatus,
        lastTelemetryAtMs: latestTelemetry?.timestampMs ?? null,
        telemetryAgeMs: ageMs,
        telemetrySource: latestTelemetry?.source ?? null,
      }

      if (telemetryEqual(previous.telemetry, nextTelemetry)) return previous
      return { ...previous, telemetry: nextTelemetry }
    })

    // Emit frame event for game/render loops
    frameSubject.emit({
      telemetry: latestTelemetry,
      elapsedSeconds: state.telemetry.elapsedSeconds,
      distanceMeters: state.telemetry.distanceMeters,
      deltaMs: deltaSeconds * 1000,
    })
  }

  const setTrainerErrorState = (error: TrainerError) => {
    resetLatestTelemetry()
    arbiter.clear({ clearLastSent: true, reason: error.message })
    setState((previous) => ({
      ...previous,
      lastError: error.message,
      lastTrainerError: error,
      trainerConnected: false,
      activeControlMode: "manual",
      telemetry: {
        ...previous.telemetry,
        speedMps: null,
        powerWatts: null,
        cadenceRpm: null,
        heartRateBpm: null,
        trainerStatus: "error",
        telemetryStatus: "missing",
        lastTelemetryAtMs: null,
        telemetryAgeMs: null,
        telemetrySource: null,
      },
    }))
  }

  const setCommandErrorState = (error: TrainerError) => {
    setState((previous) => ({
      ...previous,
      lastError: error.message,
      lastTrainerError: error,
      telemetry: { ...previous.telemetry, trainerStatus: "error" },
    }))
  }

  // Subscribe to arbiter errors for max-retries failures
  arbiter.errors.subscribe((error) => {
    setCommandErrorState({
      code: "command-rejected",
      message: error.reason,
    })
  })

  const flushCommands = () => {
    void arbiter
      .flush(trainer)
      .then((result) => {
        if (result.sent && result.command.type === "setMode") {
          const mode = result.command.mode
          setState((previous) => ({
            ...previous,
            activeControlMode:
              mode === "erg"
                ? "workout"
                : mode === "free"
                  ? "manual"
                  : "experience",
          }))
        }
        if (result.sent && state.lastError !== null) {
          setState((previous) => ({
            ...previous,
            lastError: null,
            lastTrainerError: null,
            telemetry: {
              ...previous.telemetry,
              trainerStatus:
                previous.telemetry.trainerStatus === "error"
                  ? "ready"
                  : previous.telemetry.trainerStatus,
            },
          }))
        }
      })
      .catch((error: unknown) => {
        setCommandErrorState(toTrainerError(error))
      })
  }

  const controls: TrainerControlAPI = {
    async dispatch(command, source, dispatchOptions): Promise<DispatchResult> {
      const validation = validateTrainerCommand(command)
      if (!validation.ok) {
        return { ok: false, reason: `invalid-command:${validation.reason}` }
      }

      const result = enforce(
        command,
        source,
        policy,
        trainer?.capabilities ?? emptyCapabilities
      )
      if (!result.ok) return result

      if (command.type === "disconnect") {
        resetArbiter(true)
        await controller.disconnectTrainer()
        return { ok: true }
      }

      const delivery = dispatchOptions?.delivery ?? "enqueued"
      const completion = arbiter.enqueue(command, source, dispatchOptions)
      if (delivery === "acknowledged") {
        try {
          await withTimeout(
            completion ?? Promise.resolve(),
            dispatchOptions?.timeoutMs ?? 3000,
            "command-timeout"
          )
          if (command.type === "setMode") {
            const mode = command.mode
            setState((previous) => ({
              ...previous,
              activeControlMode:
                mode === "erg"
                  ? "workout"
                  : mode === "free"
                    ? "manual"
                    : "experience",
            }))
          }
        } catch (error: unknown) {
          arbiter.clear({
            clearLastSent: false,
            reason: error instanceof Error ? error.message : String(error),
          })
          return {
            ok: false,
            reason: error instanceof Error ? error.message : String(error),
          }
        }
      }
      return { ok: true }
    },
    getCapabilities() {
      return trainer ? new Set(trainer.capabilities) : emptyCapabilities
    },
  }

  const controller: RideSessionController = {
    getState() {
      return state
    },
    getLatestTelemetry(): RideTrainerTelemetry | null {
      return latestTelemetry
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    subscribeFrame(listener) {
      return frameSubject.subscribe(listener)
    },
    async connectTrainer(nextTrainer) {
      if (disposed) {
        throw new Error("Session disposed")
      }
      if (trainer) {
        await controller.disconnectTrainer()
      }

      const generation = ++connectionGeneration
      resetArbiter(true)
      trainer = nextTrainer
      resetLatestTelemetry()
      lastTickMs = now()
      setState((previous) => ({
        ...previous,
        trainerConnected: false,
        lastError: null,
        lastTrainerError: null,
        telemetry: {
          ...previous.telemetry,
          trainerStatus: "connecting",
          telemetryStatus: "missing",
          lastTelemetryAtMs: null,
          telemetryAgeMs: null,
          telemetrySource: null,
        },
      }))

      cleanup = [
        nextTrainer.subscribeTelemetry((telemetry) => {
          setLatestTelemetry(telemetry)
        }),
        nextTrainer.subscribeState((connectionState) => {
          const ready = connectionState.kind === "connected"
          if (
            connectionState.kind === "disconnected" ||
            connectionState.kind === "error"
          ) {
            resetLatestTelemetry()
            arbiter.clear({
              clearLastSent: true,
              reason:
                connectionState.kind === "error"
                  ? connectionState.error.message
                  : "trainer-disconnected",
            })
          }
          setState((previous) => ({
            ...previous,
            trainerConnected: ready,
            activeControlMode: ready ? previous.activeControlMode : "manual",
            lastTrainerError:
              connectionState.kind === "error"
                ? connectionState.error
                : previous.lastTrainerError,
            lastError:
              connectionState.kind === "error"
                ? connectionState.error.message
                : previous.lastError,
            telemetry: {
              ...previous.telemetry,
              speedMps: ready ? previous.telemetry.speedMps : null,
              powerWatts: ready ? previous.telemetry.powerWatts : null,
              cadenceRpm: ready ? previous.telemetry.cadenceRpm : null,
              heartRateBpm: ready ? previous.telemetry.heartRateBpm : null,
              trainerStatus: mapTrainerStatus(connectionState.kind),
              telemetryStatus: ready
                ? previous.telemetry.telemetryStatus
                : "missing",
              lastTelemetryAtMs: ready
                ? previous.telemetry.lastTelemetryAtMs
                : null,
              telemetryAgeMs: ready ? previous.telemetry.telemetryAgeMs : null,
              telemetrySource: ready
                ? previous.telemetry.telemetrySource
                : null,
            },
          }))
        }),
        nextTrainer.subscribeError((error) => {
          setTrainerErrorState(error)
        }),
      ]

      let timeoutHandle: ReturnType<typeof setTimeout>
      let connectFailed = false
      let connectError: unknown
      try {
        await Promise.race([
          nextTrainer.connect(),
          new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(
              () =>
                reject({
                  code: "timeout",
                  message: "Trainer connect timed out",
                }),
              connectTimeoutMs
            )
          }),
        ])
      } catch (error: unknown) {
        connectFailed = true
        connectError = error
      } finally {
        clearTimeout(timeoutHandle!)
      }

      if (connectFailed) {
        if (generation !== connectionGeneration || trainer !== nextTrainer) {
          // Superseded by a newer connection attempt, clean up the stale adapter
          void nextTrainer.disconnect().catch(() => undefined)
          return { ok: false, error: toTrainerError(connectError) }
        }

        const trainerError = toTrainerError(connectError)
        clearSubscriptions()
        resetLatestTelemetry()
        stopTimers()
        resetArbiter(true)
        trainer = null
        try {
          await nextTrainer.disconnect()
        } catch {
          // Best effort cleanup only.
        }
        resetConnectionState({
          trainerStatus: "error",
          trainerConnected: false,
          lastError: trainerError.message,
          lastTrainerError: trainerError,
        })
        return { ok: false, error: trainerError }
      }

      if (generation !== connectionGeneration || trainer !== nextTrainer) {
        // Superseded by a newer connection attempt, clean up the stale adapter
        void nextTrainer.disconnect().catch(() => undefined)
        return {
          ok: false,
          error: { code: "transport", message: "Connection superseded." },
        }
      }
      lastTickMs = now()
      startTimers()
      return { ok: true }
    },
    async disconnectTrainer() {
      connectionGeneration += 1
      stopTimers()
      clearSubscriptions()
      resetArbiter(true)
      const activeTrainer = trainer
      trainer = null
      resetLatestTelemetry()
      try {
        await activeTrainer?.disconnect()
      } finally {
        resetConnectionState({
          trainerStatus: "disconnected",
          trainerConnected: false,
          lastError: state.lastError,
          lastTrainerError: state.lastTrainerError,
        })
      }
    },
    pause() {
      setState((previous) => ({ ...previous, paused: true }))
    },
    resume() {
      lastTickMs = now()
      setState((previous) => ({ ...previous, paused: false }))
    },
    async dispose() {
      if (disposed) return
      disposed = true
      await controller.disconnectTrainer()
      listeners.clear()
    },
    controls,
  }

  return controller
}

function mapTrainerStatus(
  kind: "disconnected" | "connecting" | "connected" | "reconnecting" | "error"
): RideTelemetry["trainerStatus"] {
  if (kind === "connected") return "ready"
  if (kind === "connecting" || kind === "reconnecting") return "connecting"
  if (kind === "error") return "error"
  return "disconnected"
}

function toTrainerError(error: unknown): TrainerError {
  if (isTrainerError(error)) return error
  if (error instanceof Error) {
    return { code: "unknown", message: error.message, cause: error }
  }
  return { code: "unknown", message: String(error), cause: error }
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  reason: string
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(reason)), timeoutMs)
    }),
  ]).finally(() => clearTimeout(timeoutHandle!))
}

function isTrainerError(value: unknown): value is TrainerError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    typeof (value as { code: unknown }).code === "string" &&
    typeof (value as { message: unknown }).message === "string"
  )
}
