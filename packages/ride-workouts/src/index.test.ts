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
      "workout"
    )
  })
})
