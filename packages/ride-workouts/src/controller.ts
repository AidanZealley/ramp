import {
  Capability
  
  
} from "@ramp/ride-core"
import { getWorkoutSegmentAtElapsed } from "./segments"
import type {DispatchResult, RideSessionController} from "@ramp/ride-core";
import type { WorkoutDefinition } from "./types"

export type WorkoutSessionState = {
  activeWorkoutId: string | null
  activeSegmentLabel: string | null
  activeSegmentIndex: number | null
  targetWatts: number | null
  isActive: boolean
  elapsedSeconds: number
  totalDurationSeconds: number
  isComplete: boolean
  controlStatus: "idle" | "starting" | "active" | "complete" | "error"
  lastError: string | null
}

export interface WorkoutSessionController {
  loadWorkout: (
    workout: WorkoutDefinition,
    ftpWatts: number
  ) => Promise<DispatchResult>
  clearWorkout: () => void
  getState: () => WorkoutSessionState
  subscribe: (listener: () => void) => () => void
  dispose: () => void
}

export type CreateWorkoutControllerOptions = {
  session: RideSessionController
  dispatchIntervalSeconds?: number
}

const initialState: WorkoutSessionState = {
  activeWorkoutId: null,
  activeSegmentLabel: null,
  activeSegmentIndex: null,
  targetWatts: null,
  isActive: false,
  elapsedSeconds: 0,
  totalDurationSeconds: 0,
  isComplete: false,
  controlStatus: "idle",
  lastError: null,
}

function getTotalDurationSeconds(workout: WorkoutDefinition): number {
  return workout.intervals.reduce(
    (sum, interval) => sum + Math.max(0, interval.durationSeconds),
    0
  )
}

export function createWorkoutController({
  dispatchIntervalSeconds = 1,
  session,
}: CreateWorkoutControllerOptions): WorkoutSessionController {
  const listeners = new Set<() => void>()
  let activeWorkout: WorkoutDefinition | null = null
  let ftpWatts = 0
  let lastDispatchSecond = -Infinity
  let lastDispatchSegmentIndex: number | null = null
  let freeModeSent = false
  let workoutStartedAtSessionSeconds = 0
  let totalDurationSeconds = 0
  let state: WorkoutSessionState = { ...initialState }
  let disposed = false

  const notify = () => {
    for (const listener of listeners) {
      try {
        listener()
      } catch (err) {
        console.error("WorkoutSession listener threw", err)
      }
    }
  }

  const statesAreEqual = (
    previous: WorkoutSessionState,
    next: WorkoutSessionState
  ) =>
    previous.activeWorkoutId === next.activeWorkoutId &&
    previous.activeSegmentLabel === next.activeSegmentLabel &&
    previous.activeSegmentIndex === next.activeSegmentIndex &&
    previous.targetWatts === next.targetWatts &&
    previous.isActive === next.isActive &&
    Math.floor(previous.elapsedSeconds) === Math.floor(next.elapsedSeconds) &&
    previous.totalDurationSeconds === next.totalDurationSeconds &&
    previous.isComplete === next.isComplete &&
    previous.controlStatus === next.controlStatus &&
    previous.lastError === next.lastError

  const setWorkoutState = (next: WorkoutSessionState) => {
    if (statesAreEqual(state, next)) {
      state = next
      return
    }
    state = next
    notify()
  }

  const failState = (reason: string) => {
    setWorkoutState({
      ...initialState,
      totalDurationSeconds,
      controlStatus: "error",
      lastError: reason,
    })
  }

  const dispatchFreeMode = async () => {
    if (freeModeSent) return
    freeModeSent = true
    try {
      const result = await session.controls.dispatch(
        { type: "setMode", mode: "free" },
        "workout"
      )
      if (!result.ok) {
        setWorkoutState({
          ...state,
          lastError: result.reason,
        })
      }
    } catch (err) {
      freeModeSent = false
      const message = err instanceof Error ? err.message : String(err)
      setWorkoutState({
        ...state,
        controlStatus: "error",
        lastError: message,
      })
    }
  }

  const update = () => {
    if (!activeWorkout || disposed) return
    const sessionState = session.getState()
    const sessionElapsed = sessionState.telemetry.elapsedSeconds
    const elapsed = Math.max(0, sessionElapsed - workoutStartedAtSessionSeconds)
    const segment = getWorkoutSegmentAtElapsed(
      activeWorkout.intervals,
      elapsed,
      ftpWatts,
      activeWorkout.powerMode
    )

    if (!segment) {
      setWorkoutState({
        activeWorkoutId: activeWorkout.id,
        activeSegmentLabel: null,
        activeSegmentIndex: null,
        targetWatts: null,
        isActive: false,
        elapsedSeconds: elapsed,
        totalDurationSeconds,
        isComplete: true,
        controlStatus: "complete",
        lastError: state.lastError,
      })
      void dispatchFreeMode()
      return
    }

    const telemetryFresh = sessionState.telemetry.telemetryStatus === "fresh"
    setWorkoutState({
      activeWorkoutId: activeWorkout.id,
      activeSegmentLabel: segment.label,
      activeSegmentIndex: segment.index,
      targetWatts: segment.targetWatts,
      isActive: true,
      elapsedSeconds: elapsed,
      totalDurationSeconds,
      isComplete: false,
      controlStatus: state.controlStatus === "error" ? "error" : "active",
      lastError: state.lastError,
    })

    if (!telemetryFresh || !sessionState.trainerConnected) return

    const dispatchSecond = Math.floor(elapsed / dispatchIntervalSeconds)
    const segmentChanged = lastDispatchSegmentIndex !== segment.index
    if (dispatchSecond !== lastDispatchSecond || segmentChanged) {
      const isFirstDispatch = lastDispatchSecond === -Infinity
      lastDispatchSecond = dispatchSecond
      lastDispatchSegmentIndex = segment.index
      void session.controls
        .dispatch(
          { type: "setTargetPower", watts: segment.targetWatts },
          "workout",
          {
            priority:
              isFirstDispatch || segmentChanged ? "immediate" : "normal",
          }
        )
        .then((result) => {
          if (result.ok) {
            setWorkoutState({
              ...state,
              controlStatus: "active",
              lastError: null,
            })
            return
          }
          setWorkoutState({
            ...state,
            controlStatus: "error",
            lastError: result.reason,
          })
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err)
          setWorkoutState({
            ...state,
            controlStatus: "error",
            lastError: message,
          })
        })
    }
  }

  const unsubscribe = session.subscribe(update)

  return {
    async loadWorkout(workout, nextFtpWatts) {
      if (disposed) return { ok: false, reason: "disposed" }
      if (!session.controls.getCapabilities().has(Capability.TargetPower)) {
        failState("capability-unsupported")
        return { ok: false, reason: "capability-unsupported" }
      }

      const firstSegment = getWorkoutSegmentAtElapsed(
        workout.intervals,
        0,
        nextFtpWatts,
        workout.powerMode
      )
      totalDurationSeconds = getTotalDurationSeconds(workout)
      if (!firstSegment) {
        failState("invalid-workout:no-active-segment")
        return { ok: false, reason: "invalid-workout:no-active-segment" }
      }

      setWorkoutState({
        ...initialState,
        totalDurationSeconds,
        controlStatus: "starting",
      })

      const modeResult = await session.controls.dispatch(
        { type: "setMode", mode: "erg" },
        "workout",
        { priority: "immediate" }
      )
      if (!modeResult.ok) {
        failState(modeResult.reason)
        return modeResult
      }

      const targetResult = await session.controls.dispatch(
        { type: "setTargetPower", watts: firstSegment.targetWatts },
        "workout",
        { priority: "immediate" }
      )
      if (!targetResult.ok) {
        failState(targetResult.reason)
        freeModeSent = false
        await dispatchFreeMode()
        activeWorkout = null
        return targetResult
      }

      activeWorkout = workout
      ftpWatts = nextFtpWatts
      lastDispatchSecond = 0
      lastDispatchSegmentIndex = firstSegment.index
      freeModeSent = false
      workoutStartedAtSessionSeconds =
        session.getState().telemetry.elapsedSeconds
      totalDurationSeconds = getTotalDurationSeconds(workout)
      setWorkoutState({
        activeWorkoutId: activeWorkout.id,
        activeSegmentLabel: firstSegment.label,
        activeSegmentIndex: firstSegment.index,
        targetWatts: firstSegment.targetWatts,
        isActive: true,
        elapsedSeconds: 0,
        totalDurationSeconds,
        isComplete: false,
        controlStatus: "active",
        lastError: null,
      })
      return { ok: true }
    },
    clearWorkout() {
      if (disposed || !activeWorkout) return
      activeWorkout = null
      totalDurationSeconds = 0
      lastDispatchSecond = -Infinity
      lastDispatchSegmentIndex = null
      workoutStartedAtSessionSeconds = 0
      setWorkoutState({ ...initialState })
      void dispatchFreeMode()
    },
    getState() {
      return state
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      if (activeWorkout) {
        void dispatchFreeMode().catch(() => undefined)
      }
      listeners.clear()
      activeWorkout = null
      unsubscribe()
    },
  }
}
