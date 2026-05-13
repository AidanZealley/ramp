import { Subject, validateTrainerCommand } from "@ramp/ride-contracts"
import { CommandArbiter } from "../arbiter"
import { defaultPolicy, enforce } from "../policy"
import type { ArbitrationPolicy } from "../policy"
import type { TrainerError, TrainerTelemetry } from "@ramp/ride-contracts"
import type {
  DispatchResult,
  RideFrameData,
  RideSessionController,
  RideSessionState,
  RideTelemetry,
  RideTrainerAdapter,
  RideTrainerTelemetry,
  TrainerCapabilitiesView,
  TrainerControlAPI,
} from "../types"
import {
  initialTelemetry,
  mapTrainerStatus,
  telemetryEqual,
  toTrainerError,
  withOptionalTimeout,
} from "./utils"

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
    const isTransport = error.code === "transport"
    if (isTransport) {
      resetArbiter(true)
      resetLatestTelemetry()
    }
    setState((previous) => ({
      ...previous,
      trainerConnected: isTransport ? false : previous.trainerConnected,
      activeControlMode: isTransport ? "manual" : previous.activeControlMode,
      lastError: error.message,
      lastTrainerError: error,
      telemetry: {
        ...previous.telemetry,
        speedMps: isTransport ? null : previous.telemetry.speedMps,
        powerWatts: isTransport ? null : previous.telemetry.powerWatts,
        cadenceRpm: isTransport ? null : previous.telemetry.cadenceRpm,
        heartRateBpm: isTransport ? null : previous.telemetry.heartRateBpm,
        trainerStatus: "error",
        telemetryStatus: isTransport ? "missing" : previous.telemetry.telemetryStatus,
        lastTelemetryAtMs: isTransport ? null : previous.telemetry.lastTelemetryAtMs,
        telemetryAgeMs: isTransport ? null : previous.telemetry.telemetryAgeMs,
        telemetrySource: isTransport ? null : previous.telemetry.telemetrySource,
      },
    }))
  }

  // Subscribe to arbiter errors for max-retries failures
  arbiter.errors.subscribe((error) => {
    setTrainerErrorState({
      code: "command-rejected",
      message: error.reason,
    })
  })

  const flushCommands = () => {
    void arbiter
      .flush(trainer)
      .then((result) => {
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
        if (result.sent && result.command.type === "setMode") {
          setState((previous) => ({
            ...previous,
            activeControlMode:
              result.command.type === "setMode" && result.command.mode === "erg"
                ? "workout"
                : result.command.type === "setMode" &&
                    result.command.mode === "free"
                  ? "manual"
                  : "experience",
          }))
        }
      })
      .catch((error: unknown) => {
        setTrainerErrorState(toTrainerError(error))
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
      const enqueueResult = arbiter.enqueue(command, source, dispatchOptions)
      if (!enqueueResult.accepted) {
        return { ok: false, reason: enqueueResult.reason }
      }
      if (delivery === "acknowledged" && enqueueResult.acknowledged) {
        const timeoutMs = dispatchOptions?.timeoutMs
        try {
          await withOptionalTimeout(
            enqueueResult.acknowledged,
            timeoutMs,
            "command-ack-timeout"
          )
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)
          return { ok: false, reason: message }
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
          if (connectionState.kind === "disconnected") {
            arbiter.clear({
              clearLastSent: true,
              reason: "trainer-disconnected",
            })
            resetLatestTelemetry()
          }
          if (connectionState.kind === "error") {
            arbiter.clear({ clearLastSent: true, reason: "trainer-error" })
            resetLatestTelemetry()
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
          error: { code: "transport", message: "Connection was superseded." },
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
      arbiter.clear({ clearLastSent: true, reason: "trainer-disconnected" })
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
        setState((previous) => ({
          ...previous,
          activeControlMode: "manual",
        }))
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
