import { describe, expect, it, vi } from "vitest"
import { Capability } from "@ramp/ride-core"
import { createWorkoutController } from "./controller"
import { getWorkoutSegmentAtElapsed } from "./segments"
import type { WorkoutDefinition } from "./types"

function createSessionHarness(options?: {
  telemetryStatus?: "missing" | "fresh" | "stale"
  capabilities?: ReadonlySet<Capability>
  dispatchImpl?: ReturnType<typeof vi.fn>
}) {
  const listeners = new Set<() => void>()
  let elapsedSeconds = 0
  let telemetryStatus = options?.telemetryStatus ?? "fresh"
  const dispatch =
    options?.dispatchImpl ??
    vi.fn(async () => {
      return { ok: true } as const
    })

  const session = {
    getState: () => ({
      telemetry: { elapsedSeconds, telemetryStatus },
    }),
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    controls: {
      dispatch,
      getCapabilities: () =>
        options?.capabilities ?? new Set(Object.values(Capability)),
    },
  } as never

  return {
    dispatch,
    listeners,
    session,
    setElapsedSeconds(next: number) {
      elapsedSeconds = next
    },
    setTelemetryStatus(next: "missing" | "fresh" | "stale") {
      telemetryStatus = next
    },
    tick() {
      for (const listener of listeners) listener()
    },
  }
}

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
    expect(getWorkoutSegmentAtElapsed(intervals, 30, 200)?.targetWatts).toBe(
      150
    )
    expect(getWorkoutSegmentAtElapsed(intervals, 60, 200)?.targetWatts).toBe(
      200
    )
    expect(getWorkoutSegmentAtElapsed(intervals, 61, 200)).toBeNull()
  })

  it("loads a workout only after ERG mode and the first target dispatch succeed", async () => {
    const harness = createSessionHarness()
    const controller = createWorkoutController({ session: harness.session })
    const workout: WorkoutDefinition = {
      id: "w1",
      title: "Workout",
      powerMode: "percentage",
      intervals: [{ startPower: 110, endPower: 110, durationSeconds: 60 }],
    }

    await expect(controller.loadWorkout(workout, 200)).resolves.toEqual({
      ok: true,
    })

    expect(harness.dispatch.mock.calls).toEqual([
      [{ type: "setMode", mode: "erg" }, "workout", { priority: "immediate" }],
      [
        { type: "setTargetPower", watts: 220 },
        "workout",
        { priority: "immediate" },
      ],
    ])
    expect(controller.getState()).toMatchObject({
      activeWorkoutId: "w1",
      controlStatus: "active",
      isActive: true,
    })
  })

  it("fails cleanly without target power capability", async () => {
    const harness = createSessionHarness({
      capabilities: new Set([Capability.ReadPower]),
    })
    const controller = createWorkoutController({ session: harness.session })

    await expect(
      controller.loadWorkout(
        {
          id: "w1",
          title: "Workout",
          powerMode: "percentage",
          intervals: [{ startPower: 100, endPower: 100, durationSeconds: 60 }],
        },
        200
      )
    ).resolves.toEqual({
      ok: false,
      reason: "capability-unsupported",
    })

    expect(controller.getState().controlStatus).toBe("error")
    expect(harness.dispatch).not.toHaveBeenCalled()
  })

  it("rolls back when the first target dispatch fails", async () => {
    const dispatch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, reason: "capability-unsupported" })
      .mockResolvedValueOnce({ ok: true })
    const harness = createSessionHarness({ dispatchImpl: dispatch })
    const controller = createWorkoutController({ session: harness.session })

    await expect(
      controller.loadWorkout(
        {
          id: "w1",
          title: "Workout",
          powerMode: "percentage",
          intervals: [{ startPower: 100, endPower: 100, durationSeconds: 60 }],
        },
        200
      )
    ).resolves.toEqual({
      ok: false,
      reason: "capability-unsupported",
    })

    expect(controller.getState()).toMatchObject({
      activeWorkoutId: null,
      controlStatus: "error",
    })
    expect(dispatch).toHaveBeenLastCalledWith(
      { type: "setMode", mode: "free" },
      "workout"
    )
  })

  it("pauses periodic target dispatch while telemetry is stale", async () => {
    const harness = createSessionHarness({ telemetryStatus: "fresh" })
    const controller = createWorkoutController({ session: harness.session })
    await controller.loadWorkout(
      {
        id: "w1",
        title: "Workout",
        powerMode: "percentage",
        intervals: [
          { startPower: 100, endPower: 100, durationSeconds: 10 },
          { startPower: 150, endPower: 150, durationSeconds: 10 },
        ],
      },
      200
    )

    harness.dispatch.mockClear()
    harness.setElapsedSeconds(11)
    harness.setTelemetryStatus("stale")
    harness.tick()

    expect(harness.dispatch).not.toHaveBeenCalled()

    harness.setTelemetryStatus("fresh")
    harness.tick()
    expect(harness.dispatch).toHaveBeenCalledWith(
      { type: "setTargetPower", watts: 300 },
      "workout",
      { priority: "immediate" }
    )
  })

  it("dispose during an active workout sends free mode once", async () => {
    const harness = createSessionHarness()
    const controller = createWorkoutController({ session: harness.session })
    await controller.loadWorkout(
      {
        id: "w1",
        title: "Workout",
        powerMode: "percentage",
        intervals: [{ startPower: 100, endPower: 100, durationSeconds: 60 }],
      },
      200
    )

    harness.dispatch.mockClear()
    controller.dispose()
    controller.dispose()

    expect(harness.dispatch).toHaveBeenCalledTimes(1)
    expect(harness.dispatch).toHaveBeenCalledWith(
      { type: "setMode", mode: "free" },
      "workout"
    )
  })

  it("dispose after completion does not send duplicate free mode", async () => {
    const harness = createSessionHarness()
    const controller = createWorkoutController({ session: harness.session })
    await controller.loadWorkout(
      {
        id: "w1",
        title: "Workout",
        powerMode: "percentage",
        intervals: [{ startPower: 100, endPower: 100, durationSeconds: 30 }],
      },
      200
    )

    harness.dispatch.mockClear()
    harness.setElapsedSeconds(31)
    harness.tick()
    controller.dispose()

    const freeModeCalls = harness.dispatch.mock.calls.filter(
      ([command]) =>
        typeof command === "object" &&
        command !== null &&
        "type" in command &&
        command.type === "setMode" &&
        "mode" in command &&
        command.mode === "free"
    )
    expect(freeModeCalls).toHaveLength(1)
  })

  it("dispose tolerates rejected free-mode dispatch", async () => {
    const harness = createSessionHarness({
      dispatchImpl: vi.fn(async (command) =>
        command.type === "setMode" && command.mode === "free"
          ? { ok: false, reason: "transport" }
          : { ok: true }
      ),
    })
    const controller = createWorkoutController({ session: harness.session })
    await controller.loadWorkout(
      {
        id: "w1",
        title: "Workout",
        powerMode: "percentage",
        intervals: [{ startPower: 100, endPower: 100, durationSeconds: 60 }],
      },
      200
    )

    expect(() => controller.dispose()).not.toThrow()
  })
})
