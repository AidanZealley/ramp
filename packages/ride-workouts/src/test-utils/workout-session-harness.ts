import { Capability } from "@ramp/ride-core"
import type {
  DispatchOptions,
  DispatchResult,
  RideSessionState,
  TrainerCapabilitiesView,
  TrainerCommand,
} from "@ramp/ride-core"
import type { WorkoutRideSession } from "../controller"

export type WorkoutDispatchEntry = {
  command: TrainerCommand
  source: "workout"
  options?: DispatchOptions
}

type DispatchOutcome = DispatchResult | Promise<DispatchResult>

export function createWorkoutSessionHarness(options?: {
  telemetryStatus?: "missing" | "fresh" | "stale"
  trainerConnected?: boolean
  capabilities?: TrainerCapabilitiesView
  dispatch?: (entry: WorkoutDispatchEntry) => DispatchOutcome
}) {
  const listeners = new Set<() => void>()
  const dispatches: Array<WorkoutDispatchEntry> = []
  const queuedDispatches: Array<{
    resolve: (value: DispatchResult) => void
    reject: (error: unknown) => void
  }> = []
  let elapsedSeconds = 0
  let telemetryStatus = options?.telemetryStatus ?? "fresh"
  let trainerConnected = options?.trainerConnected ?? true
  let capabilities =
    options?.capabilities ?? new Set<Capability>(Object.values(Capability))

  const state = (): RideSessionState => ({
    telemetry: {
      elapsedSeconds,
      distanceMeters: 0,
      speedMps: null,
      powerWatts: null,
      cadenceRpm: null,
      heartRateBpm: null,
      trainerStatus: trainerConnected ? "ready" : "disconnected",
      telemetryStatus,
      lastTelemetryAtMs: null,
      telemetryAgeMs: null,
      telemetrySource: null,
    },
    trainerConnected,
    paused: false,
    activeControlMode: "manual",
    lastError: null,
    lastTrainerError: null,
  })

  const session: WorkoutRideSession = {
    getState: state,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    controls: {
      dispatch(command, source, dispatchOptions) {
        const entry = { command, source, options: dispatchOptions }
        dispatches.push(entry)
        if (options?.dispatch) return Promise.resolve(options.dispatch(entry))
        return new Promise<DispatchResult>((resolve, reject) => {
          queuedDispatches.push({ resolve, reject })
        })
      },
      getCapabilities: () => capabilities,
    },
  }

  return {
    session,
    dispatches,
    setElapsedSeconds(next: number) {
      elapsedSeconds = next
    },
    setTelemetryStatus(next: "missing" | "fresh" | "stale") {
      telemetryStatus = next
    },
    setTrainerConnected(next: boolean) {
      trainerConnected = next
    },
    setCapabilities(next: TrainerCapabilitiesView) {
      capabilities = next
    },
    resolveNextDispatch(result: DispatchResult = { ok: true }) {
      const next = queuedDispatches.shift()
      if (!next) throw new Error("No pending dispatch")
      next.resolve(result)
    },
    rejectNextDispatch(error: unknown) {
      const next = queuedDispatches.shift()
      if (!next) throw new Error("No pending dispatch")
      next.reject(error)
    },
    tick() {
      for (const listener of listeners) listener()
    },
  }
}
