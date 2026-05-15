import { Capability } from "@ramp/ride-core"
import { getWorkoutSegmentAtElapsed } from "./segments"
import type {
  DispatchOptions,
  DispatchResult,
  RideSessionState,
  TrainerCapabilitiesView,
  TrainerCommand,
} from "@ramp/ride-core"
import type { WorkoutDefinition } from "./types"

export type WorkoutRideSession = {
  getState: () => RideSessionState
  subscribe: (listener: () => void) => () => void
  controls: {
    dispatch: (
      command: TrainerCommand,
      source: "workout",
      options?: DispatchOptions
    ) => Promise<DispatchResult>
    getCapabilities: () => TrainerCapabilitiesView
  }
}

export type WorkoutSessionState = {
  activeWorkoutId: string | null
  activeSegmentLabel: string | null
  activeSegmentIndex: number | null
  targetWatts: number | null
  difficultyPercent: number
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
  seekToElapsedSeconds: (elapsedSeconds: number) => Promise<DispatchResult>
  setDifficultyPercent: (difficultyPercent: number) => Promise<DispatchResult>
  resetDifficultyPercent: () => Promise<DispatchResult>
  clearWorkout: () => void
  getState: () => WorkoutSessionState
  subscribe: (listener: () => void) => () => void
  dispose: () => void
}

export type CreateWorkoutControllerOptions = {
  session: WorkoutRideSession
  dispatchIntervalSeconds?: number
}

export const BASELINE_DIFFICULTY_PERCENT = 100
export const MIN_DIFFICULTY_PERCENT = 50
export const MAX_DIFFICULTY_PERCENT = 150

const initialState: WorkoutSessionState = {
  activeWorkoutId: null,
  activeSegmentLabel: null,
  activeSegmentIndex: null,
  targetWatts: null,
  difficultyPercent: BASELINE_DIFFICULTY_PERCENT,
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalizeDifficultyPercent(difficultyPercent: number): number {
  const finiteValue = Number.isFinite(difficultyPercent)
    ? difficultyPercent
    : BASELINE_DIFFICULTY_PERCENT
  return clamp(
    Math.round(finiteValue),
    MIN_DIFFICULTY_PERCENT,
    MAX_DIFFICULTY_PERCENT
  )
}

function scaleTargetWatts(targetWatts: number, difficultyPercent: number) {
  return Math.round((targetWatts * difficultyPercent) / 100)
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
  let asyncStateGeneration = 0

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
    previous.difficultyPercent === next.difficultyPercent &&
    previous.isActive === next.isActive &&
    Math.floor(previous.elapsedSeconds) === Math.floor(next.elapsedSeconds) &&
    previous.totalDurationSeconds === next.totalDurationSeconds &&
    previous.isComplete === next.isComplete &&
    previous.controlStatus === next.controlStatus &&
    previous.lastError === next.lastError

  const setWorkoutState = (
    next:
      | WorkoutSessionState
      | ((previous: WorkoutSessionState) => WorkoutSessionState)
  ) => {
    const resolved = typeof next === "function" ? next(state) : next
    if (statesAreEqual(state, resolved)) {
      state = resolved
      return
    }
    state = resolved
    notify()
  }

  const failState = (reason: string) => {
    asyncStateGeneration += 1
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
    const generation = asyncStateGeneration
    try {
      const result = await session.controls.dispatch(
        { type: "setMode", mode: "free" },
        "workout"
      )
      if (generation !== asyncStateGeneration || disposed) return
      if (!result.ok) {
        setWorkoutState((previous) => ({
          ...previous,
          lastError: result.reason,
        }))
      }
    } catch (err) {
      freeModeSent = false
      if (generation !== asyncStateGeneration || disposed) return
      const message = err instanceof Error ? err.message : String(err)
      setWorkoutState((previous) => ({
        ...previous,
        controlStatus: "error",
        lastError: message,
      }))
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
    const difficultyPercent = state.difficultyPercent

    if (!segment) {
      setWorkoutState({
        activeWorkoutId: activeWorkout.id,
        activeSegmentLabel: null,
        activeSegmentIndex: null,
        targetWatts: null,
        difficultyPercent,
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
    const scaledTargetWatts = scaleTargetWatts(
      segment.targetWatts,
      difficultyPercent
    )
    setWorkoutState({
      activeWorkoutId: activeWorkout.id,
      activeSegmentLabel: segment.label,
      activeSegmentIndex: segment.index,
      targetWatts: scaledTargetWatts,
      difficultyPercent,
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
      const generation = asyncStateGeneration
      void session.controls
        .dispatch(
          { type: "setTargetPower", watts: scaledTargetWatts },
          "workout",
          {
            priority:
              isFirstDispatch || segmentChanged ? "immediate" : "normal",
            delivery:
              isFirstDispatch || segmentChanged ? "acknowledged" : "enqueued",
          }
        )
        .then((result) => {
          if (generation !== asyncStateGeneration || disposed) return
          if (result.ok) {
            setWorkoutState((previous) => ({
              ...previous,
              controlStatus: "active",
              lastError: null,
            }))
            return
          }
          setWorkoutState((previous) => ({
            ...previous,
            controlStatus: "error",
            lastError: result.reason,
          }))
        })
        .catch((err: unknown) => {
          if (generation !== asyncStateGeneration || disposed) return
          const message = err instanceof Error ? err.message : String(err)
          setWorkoutState((previous) => ({
            ...previous,
            controlStatus: "error",
            lastError: message,
          }))
        })
    }
  }

  const unsubscribe = session.subscribe(update)

  const dispatchImmediateTarget = async (
    targetWatts: number,
    generation: number
  ): Promise<DispatchResult> => {
    try {
      const result = await session.controls.dispatch(
        { type: "setTargetPower", watts: targetWatts },
        "workout",
        { priority: "immediate", delivery: "acknowledged" }
      )
      if (generation !== asyncStateGeneration || disposed) return result
      if (result.ok) {
        setWorkoutState((previous) => ({
          ...previous,
          controlStatus: "active",
          lastError: null,
        }))
        return result
      }
      setWorkoutState((previous) => ({
        ...previous,
        controlStatus: "error",
        lastError: result.reason,
      }))
      return result
    } catch (err) {
      if (generation !== asyncStateGeneration || disposed) {
        return { ok: false, reason: "stale-dispatch" }
      }
      const message = err instanceof Error ? err.message : String(err)
      setWorkoutState((previous) => ({
        ...previous,
        controlStatus: "error",
        lastError: message,
      }))
      return { ok: false, reason: message }
    }
  }

  const setDifficultyPercent = async (
    nextDifficultyPercent: number
  ): Promise<DispatchResult> => {
    if (disposed) return { ok: false, reason: "disposed" }
    const difficultyPercent = normalizeDifficultyPercent(nextDifficultyPercent)

    if (!activeWorkout) {
      setWorkoutState((previous) => ({
        ...previous,
        difficultyPercent,
      }))
      return { ok: true }
    }

    const sessionState = session.getState()
    const elapsed = Math.max(
      0,
      sessionState.telemetry.elapsedSeconds - workoutStartedAtSessionSeconds
    )
    const segment = getWorkoutSegmentAtElapsed(
      activeWorkout.intervals,
      elapsed,
      ftpWatts,
      activeWorkout.powerMode
    )

    if (!segment) {
      setWorkoutState((previous) => ({
        ...previous,
        difficultyPercent,
      }))
      return { ok: true }
    }

    const scaledTargetWatts = scaleTargetWatts(
      segment.targetWatts,
      difficultyPercent
    )
    asyncStateGeneration += 1
    const generation = asyncStateGeneration
    setWorkoutState((previous) => ({
      ...previous,
      activeSegmentLabel: segment.label,
      activeSegmentIndex: segment.index,
      targetWatts: scaledTargetWatts,
      difficultyPercent,
      isActive: true,
      elapsedSeconds: elapsed,
      totalDurationSeconds,
      isComplete: false,
    }))

    if (
      sessionState.telemetry.telemetryStatus !== "fresh" ||
      !sessionState.trainerConnected
    ) {
      return { ok: true }
    }

    return dispatchImmediateTarget(scaledTargetWatts, generation)
  }

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

      asyncStateGeneration += 1
      setWorkoutState({
        ...initialState,
        difficultyPercent: BASELINE_DIFFICULTY_PERCENT,
        totalDurationSeconds,
        controlStatus: "starting",
      })

      const modeResult = await session.controls.dispatch(
        { type: "setMode", mode: "erg" },
        "workout",
        { priority: "immediate", delivery: "acknowledged" }
      )
      if (!modeResult.ok) {
        failState(modeResult.reason)
        return modeResult
      }

      const difficultyPercent = BASELINE_DIFFICULTY_PERCENT
      const firstTargetWatts = scaleTargetWatts(
        firstSegment.targetWatts,
        difficultyPercent
      )
      const targetResult = await session.controls.dispatch(
        { type: "setTargetPower", watts: firstTargetWatts },
        "workout",
        { priority: "immediate", delivery: "acknowledged" }
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
        targetWatts: firstTargetWatts,
        difficultyPercent,
        isActive: true,
        elapsedSeconds: 0,
        totalDurationSeconds,
        isComplete: false,
        controlStatus: "active",
        lastError: null,
      })
      return { ok: true }
    },
    async seekToElapsedSeconds(elapsedSeconds) {
      if (disposed) return { ok: false, reason: "disposed" }
      if (!activeWorkout) return { ok: false, reason: "no-active-workout" }

      const sessionState = session.getState()
      const nextElapsed = clamp(
        Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0,
        0,
        totalDurationSeconds
      )
      const segment = getWorkoutSegmentAtElapsed(
        activeWorkout.intervals,
        nextElapsed,
        ftpWatts,
        activeWorkout.powerMode
      )
      if (!segment) return { ok: false, reason: "invalid-workout:no-segment" }
      const difficultyPercent = state.difficultyPercent
      const scaledTargetWatts = scaleTargetWatts(
        segment.targetWatts,
        difficultyPercent
      )

      asyncStateGeneration += 1
      const generation = asyncStateGeneration
      freeModeSent = false
      workoutStartedAtSessionSeconds =
        sessionState.telemetry.elapsedSeconds - nextElapsed
      lastDispatchSecond = Math.floor(nextElapsed / dispatchIntervalSeconds)
      lastDispatchSegmentIndex = segment.index
      setWorkoutState({
        activeWorkoutId: activeWorkout.id,
        activeSegmentLabel: segment.label,
        activeSegmentIndex: segment.index,
        targetWatts: scaledTargetWatts,
        difficultyPercent,
        isActive: true,
        elapsedSeconds: nextElapsed,
        totalDurationSeconds,
        isComplete: false,
        controlStatus: state.controlStatus === "error" ? "error" : "active",
        lastError: state.lastError,
      })

      if (
        sessionState.telemetry.telemetryStatus !== "fresh" ||
        !sessionState.trainerConnected
      ) {
        return { ok: true }
      }

      return dispatchImmediateTarget(scaledTargetWatts, generation)
    },
    setDifficultyPercent,
    resetDifficultyPercent() {
      return setDifficultyPercent(BASELINE_DIFFICULTY_PERCENT)
    },
    clearWorkout() {
      if (disposed) return
      if (!activeWorkout) {
        setWorkoutState({ ...initialState })
        return
      }
      asyncStateGeneration += 1
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
      asyncStateGeneration += 1
      if (activeWorkout) {
        void dispatchFreeMode().catch(() => undefined)
      }
      listeners.clear()
      activeWorkout = null
      unsubscribe()
    },
  }
}
