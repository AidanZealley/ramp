import { getWorkoutSegmentAtElapsed } from "./segments"
import type { RideSessionController } from "@ramp/ride-core"
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
}

export interface WorkoutSessionController {
  loadWorkout: (workout: WorkoutDefinition, ftpWatts: number) => void
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
    for (const listener of listeners) listener()
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
    previous.isComplete === next.isComplete

  const setWorkoutState = (next: WorkoutSessionState) => {
    if (statesAreEqual(state, next)) {
      state = next
      return
    }
    state = next
    notify()
  }

  const update = () => {
    if (!activeWorkout || disposed) return
    const sessionElapsed = session.getState().telemetry.elapsedSeconds
    const elapsed = Math.max(
      0,
      sessionElapsed - workoutStartedAtSessionSeconds
    )
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
      })
      if (!freeModeSent) {
        freeModeSent = true
        void session.controls.dispatch(
          { type: "setMode", mode: "free" },
          "workout"
        )
      }
      return
    }

    setWorkoutState({
      activeWorkoutId: activeWorkout.id,
      activeSegmentLabel: segment.label,
      activeSegmentIndex: segment.index,
      targetWatts: segment.targetWatts,
      isActive: true,
      elapsedSeconds: elapsed,
      totalDurationSeconds,
      isComplete: false,
    })

    const dispatchSecond = Math.floor(elapsed / dispatchIntervalSeconds)
    const segmentChanged = lastDispatchSegmentIndex !== segment.index
    if (
      dispatchSecond !== lastDispatchSecond ||
      segmentChanged
    ) {
      const isFirstDispatch = lastDispatchSecond === -Infinity
      lastDispatchSecond = dispatchSecond
      lastDispatchSegmentIndex = segment.index
      void session.controls.dispatch(
        { type: "setTargetPower", watts: segment.targetWatts },
        "workout",
        { priority: isFirstDispatch || segmentChanged ? "immediate" : "normal" }
      )
    }
  }

  const unsubscribe = session.subscribe(update)

  return {
    loadWorkout(workout, nextFtpWatts) {
      if (disposed) return
      activeWorkout = workout
      ftpWatts = nextFtpWatts
      lastDispatchSecond = -Infinity
      lastDispatchSegmentIndex = null
      freeModeSent = false
      workoutStartedAtSessionSeconds =
        session.getState().telemetry.elapsedSeconds
      totalDurationSeconds = getTotalDurationSeconds(workout)
      void session.controls.dispatch(
        { type: "setMode", mode: "erg" },
        "workout"
      )
      update()
    },
    clearWorkout() {
      if (disposed || !activeWorkout) return
      activeWorkout = null
      totalDurationSeconds = 0
      lastDispatchSegmentIndex = null
      workoutStartedAtSessionSeconds = 0
      setWorkoutState({ ...initialState })
      void session.controls.dispatch(
        { type: "setMode", mode: "free" },
        "workout"
      )
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
      listeners.clear()
      activeWorkout = null
      unsubscribe()
    },
  }
}
