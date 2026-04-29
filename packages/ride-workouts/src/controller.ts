import type { RideSessionController } from "@ramp/ride-core"
import { getWorkoutSegmentAtElapsed } from "./segments"
import type { WorkoutDefinition } from "./types"

export interface WorkoutSessionController {
  loadWorkout(workout: WorkoutDefinition, ftpWatts: number): void
  clearWorkout(): void
  getState(): {
    activeWorkoutId: string | null
    activeSegmentLabel: string | null
    targetWatts: number | null
    isActive: boolean
  }
  subscribe(listener: () => void): () => void
}

export type CreateWorkoutControllerOptions = {
  session: RideSessionController
  dispatchIntervalSeconds?: number
}

export function createWorkoutController({
  dispatchIntervalSeconds = 1,
  session,
}: CreateWorkoutControllerOptions): WorkoutSessionController {
  const listeners = new Set<() => void>()
  let activeWorkout: WorkoutDefinition | null = null
  let ftpWatts = 0
  let lastDispatchSecond = -Infinity
  let freeModeSent = false
  let state = {
    activeWorkoutId: null as string | null,
    activeSegmentLabel: null as string | null,
    targetWatts: null as number | null,
    isActive: false,
  }

  const notify = () => {
    for (const listener of listeners) listener()
  }

  const update = () => {
    if (!activeWorkout) return
    const elapsed = session.getState().telemetry.elapsedSeconds
    const segment = getWorkoutSegmentAtElapsed(
      activeWorkout.intervals,
      elapsed,
      ftpWatts,
      activeWorkout.powerMode
    )

    if (!segment) {
      state = {
        activeWorkoutId: activeWorkout.id,
        activeSegmentLabel: null,
        targetWatts: null,
        isActive: false,
      }
      notify()
      if (!freeModeSent) {
        freeModeSent = true
        void session.controls.dispatch({ type: "setMode", mode: "free" }, "workout")
      }
      return
    }

    state = {
      activeWorkoutId: activeWorkout.id,
      activeSegmentLabel: segment.label,
      targetWatts: segment.targetWatts,
      isActive: true,
    }
    notify()

    const dispatchSecond = Math.floor(elapsed / dispatchIntervalSeconds)
    if (dispatchSecond !== lastDispatchSecond) {
      lastDispatchSecond = dispatchSecond
      void session.controls.dispatch(
        { type: "setTargetPower", watts: segment.targetWatts },
        "workout"
      )
    }
  }

  const unsubscribe = session.subscribe(update)

  return {
    loadWorkout(workout, nextFtpWatts) {
      activeWorkout = workout
      ftpWatts = nextFtpWatts
      lastDispatchSecond = -Infinity
      freeModeSent = false
      void session.controls.dispatch({ type: "setMode", mode: "erg" }, "workout")
      update()
    },
    clearWorkout() {
      activeWorkout = null
      state = {
        activeWorkoutId: null,
        activeSegmentLabel: null,
        targetWatts: null,
        isActive: false,
      }
      notify()
      void session.controls.dispatch({ type: "setMode", mode: "free" }, "workout")
    },
    getState() {
      return state
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) unsubscribe()
      }
    },
  }
}
