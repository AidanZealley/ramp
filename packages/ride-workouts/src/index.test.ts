import { describe, expect, it, vi } from "vitest"
import { createWorkoutController } from "./controller"
import { getWorkoutSegmentAtElapsed } from "./segments"
import type { WorkoutDefinition } from "./types"

describe("ride-workouts", () => {
  it("handles exact boundary times", () => {
    const intervals = [
      { startPower: 70, endPower: 70, durationSeconds: 60 },
      { startPower: 110, endPower: 110, durationSeconds: 30 },
    ]

    expect(getWorkoutSegmentAtElapsed(intervals, 60, 200)?.index).toBe(1)
    expect(getWorkoutSegmentAtElapsed(intervals, 90, 200)?.index).toBe(1)
  })

  it("supports absolute power mode", () => {
    expect(
      getWorkoutSegmentAtElapsed(
        [{ startPower: 220, endPower: 220, durationSeconds: 60 }],
        0,
        200,
        "absolute"
      )?.targetWatts
    ).toBe(220)
  })

  it("interpolates ramp targets over elapsed segment time", () => {
    const intervals = [{ startPower: 50, endPower: 100, durationSeconds: 60 }]

    expect(getWorkoutSegmentAtElapsed(intervals, 0, 200)?.targetWatts).toBe(100)
    expect(getWorkoutSegmentAtElapsed(intervals, 30, 200)?.targetWatts).toBe(150)
    expect(getWorkoutSegmentAtElapsed(intervals, 60, 200)?.targetWatts).toBe(200)
    expect(getWorkoutSegmentAtElapsed(intervals, 61, 200)).toBeNull()
  })

  it("interpolates absolute ramp targets", () => {
    const intervals = [{ startPower: 200, endPower: 300, durationSeconds: 40 }]

    expect(
      getWorkoutSegmentAtElapsed(intervals, 20, 200, "absolute")?.targetWatts
    ).toBe(250)
  })

  it("dispatches workout target watts", () => {
    const listeners = new Set<() => void>()
    const dispatch = vi.fn()
    const session = {
      getState: () => ({
        telemetry: { elapsedSeconds: 0 },
      }),
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      controls: { dispatch },
    } as never
    const workout: WorkoutDefinition = {
      id: "w1",
      title: "Workout",
      powerMode: "percentage",
      intervals: [{ startPower: 110, endPower: 110, durationSeconds: 60 }],
    }

    const controller = createWorkoutController({ session })
    controller.loadWorkout(workout, 200)

    expect(dispatch).toHaveBeenCalledWith(
      { type: "setTargetPower", watts: 220 },
      "workout",
      { priority: "immediate" }
    )
  })

  it("keeps the session subscription after React listeners unsubscribe", () => {
    const listeners = new Set<() => void>()
    const dispatch = vi.fn()
    let elapsedSeconds = 0
    const session = {
      getState: () => ({
        telemetry: { elapsedSeconds },
      }),
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      controls: { dispatch },
    } as never
    const workout: WorkoutDefinition = {
      id: "w1",
      title: "Workout",
      powerMode: "percentage",
      intervals: [
        { startPower: 100, endPower: 100, durationSeconds: 10 },
        { startPower: 150, endPower: 150, durationSeconds: 10 },
      ],
    }

    const controller = createWorkoutController({ session })
    controller.loadWorkout(workout, 200)
    const unsubscribe = controller.subscribe(() => undefined)
    unsubscribe()
    controller.subscribe(() => undefined)

    elapsedSeconds = 11
    for (const listener of listeners) listener()

    expect(controller.getState().activeSegmentIndex).toBe(1)
    expect(controller.getState().targetWatts).toBe(300)
  })

  it("disposes the session subscription once", () => {
    const listeners = new Set<() => void>()
    const dispatch = vi.fn()
    const unsubscribe = vi.fn(() => listeners.clear())
    const session = {
      getState: () => ({
        telemetry: { elapsedSeconds: 0 },
      }),
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return unsubscribe
      },
      controls: { dispatch },
    } as never

    const controller = createWorkoutController({ session })
    controller.subscribe(() => undefined)
    controller.dispose()
    controller.dispose()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it("exposes total duration immediately for empty workouts", () => {
    const session = {
      getState: () => ({
        telemetry: { elapsedSeconds: 0 },
      }),
      subscribe: () => () => undefined,
      controls: { dispatch: vi.fn() },
    } as never
    const controller = createWorkoutController({ session })

    controller.loadWorkout(
      { id: "empty", title: "Empty", powerMode: "percentage", intervals: [] },
      200
    )

    expect(controller.getState()).toMatchObject({
      activeWorkoutId: "empty",
      totalDurationSeconds: 0,
      isComplete: true,
    })
  })

  it("does not emit free mode when clearing without an active workout", () => {
    const dispatch = vi.fn()
    const session = {
      getState: () => ({
        telemetry: { elapsedSeconds: 0 },
      }),
      subscribe: () => () => undefined,
      controls: { dispatch },
    } as never
    const controller = createWorkoutController({ session })

    controller.clearWorkout()

    expect(dispatch).not.toHaveBeenCalled()
  })

  it("starts the workout at segment 1 even if ride session was already running", () => {
    const listeners = new Set<() => void>()
    const dispatch = vi.fn()
    let elapsedSeconds = 30
    const session = {
      getState: () => ({
        telemetry: { elapsedSeconds },
      }),
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      controls: { dispatch },
    } as never
    const workout: WorkoutDefinition = {
      id: "w1",
      title: "Workout",
      powerMode: "percentage",
      intervals: [
        { startPower: 50, endPower: 50, durationSeconds: 60 },
        { startPower: 120, endPower: 120, durationSeconds: 60 },
      ],
    }

    const controller = createWorkoutController({ session })
    controller.loadWorkout(workout, 200)

    const stateAtStart = controller.getState()
    expect(stateAtStart.activeSegmentIndex).toBe(0)
    expect(stateAtStart.elapsedSeconds).toBe(0)
    expect(stateAtStart.targetWatts).toBe(100)
    expect(stateAtStart.isActive).toBe(true)
    expect(stateAtStart.isComplete).toBe(false)
    expect(stateAtStart.totalDurationSeconds).toBe(120)

    // Simulate ride session advancing 60s after the workout was loaded
    elapsedSeconds = 90
    for (const listener of listeners) listener()

    const stateAtSecondInterval = controller.getState()
    expect(stateAtSecondInterval.activeSegmentIndex).toBe(1)
    expect(stateAtSecondInterval.elapsedSeconds).toBe(60)
    expect(stateAtSecondInterval.targetWatts).toBe(240)
  })

  it("marks the workout complete after the final interval and switches to free mode once", () => {
    const listeners = new Set<() => void>()
    const dispatch = vi.fn()
    let elapsedSeconds = 0
    const session = {
      getState: () => ({
        telemetry: { elapsedSeconds },
      }),
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      controls: { dispatch },
    } as never
    const workout: WorkoutDefinition = {
      id: "w-complete",
      title: "Short Workout",
      powerMode: "percentage",
      intervals: [{ startPower: 100, endPower: 100, durationSeconds: 30 }],
    }

    const controller = createWorkoutController({ session })
    controller.loadWorkout(workout, 200)

    expect(controller.getState().isComplete).toBe(false)

    // Advance past the final interval
    elapsedSeconds = 31
    for (const listener of listeners) listener()

    const finalState = controller.getState()
    expect(finalState.isComplete).toBe(true)
    expect(finalState.isActive).toBe(false)
    expect(finalState.targetWatts).toBeNull()
    expect(finalState.activeSegmentIndex).toBeNull()
    expect(finalState.totalDurationSeconds).toBe(30)

    const freeModeCalls = dispatch.mock.calls.filter(
      ([command]) =>
        typeof command === "object" &&
        command !== null &&
        "type" in command &&
        command.type === "setMode" &&
        "mode" in command &&
        command.mode === "free"
    )
    expect(freeModeCalls).toHaveLength(1)

    // Trigger another tick to confirm free mode is dispatched only once
    elapsedSeconds = 35
    for (const listener of listeners) listener()

    const freeModeCallsAfterTick = dispatch.mock.calls.filter(
      ([command]) =>
        typeof command === "object" &&
        command !== null &&
        "type" in command &&
        command.type === "setMode" &&
        "mode" in command &&
        command.mode === "free"
    )
    expect(freeModeCallsAfterTick).toHaveLength(1)
  })
})
