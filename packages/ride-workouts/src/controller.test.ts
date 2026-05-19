import { describe, expect, it, vi } from "vitest"
import { Capability } from "@ramp/ride-core"
import { createWorkoutController } from "./controller"
import { createWorkoutSessionHarness } from "./test-utils/workout-session-harness"
import type { WorkoutDefinition } from "./types"
import type { DispatchResult } from "@ramp/ride-core"

function createSessionHarness(options?: {
  telemetryStatus?: "missing" | "fresh" | "stale"
  trainerConnected?: boolean
  capabilities?: ReadonlySet<Capability>
  dispatchImpl?: ReturnType<typeof vi.fn>
}) {
  const dispatch =
    options?.dispatchImpl ??
    vi.fn(() => Promise.resolve({ ok: true } satisfies DispatchResult))
  const harness = createWorkoutSessionHarness({
    telemetryStatus: options?.telemetryStatus,
    trainerConnected: options?.trainerConnected,
    capabilities: options?.capabilities,
    dispatch: ({ command, source, options: dispatchOptions }) =>
      dispatch(command, source, dispatchOptions),
  })
  return {
    ...harness,
    dispatch,
  }
}

describe("ride-workouts", () => {
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
      [
        { type: "setMode", mode: "erg" },
        "workout",
        { priority: "immediate", delivery: "acknowledged" },
      ],
      [
        { type: "setTargetPower", watts: 220 },
        "workout",
        { priority: "immediate", delivery: "acknowledged" },
      ],
    ])
    expect(controller.getState()).toMatchObject({
      activeWorkoutId: "w1",
      controlStatus: "active",
      difficultyPercent: 100,
      isActive: true,
    })
  })

  it("immediately dispatches scaled target watts after difficulty changes", async () => {
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
    await expect(controller.setDifficultyPercent(105)).resolves.toEqual({
      ok: true,
    })

    expect(controller.getState()).toMatchObject({
      difficultyPercent: 105,
      targetWatts: 210,
    })
    expect(harness.dispatch).toHaveBeenCalledWith(
      { type: "setTargetPower", watts: 210 },
      "workout",
      { priority: "immediate", delivery: "acknowledged" }
    )
  })

  it("scales steady-state and ramp segment targets from the current segment", async () => {
    const harness = createSessionHarness()
    const controller = createWorkoutController({ session: harness.session })
    await controller.loadWorkout(
      {
        id: "w1",
        title: "Workout",
        powerMode: "percentage",
        intervals: [
          { startPower: 100, endPower: 100, durationSeconds: 30 },
          { startPower: 50, endPower: 100, durationSeconds: 60 },
        ],
      },
      200
    )

    harness.dispatch.mockClear()
    await controller.setDifficultyPercent(110)
    expect(controller.getState().targetWatts).toBe(220)
    expect(harness.dispatch).toHaveBeenLastCalledWith(
      { type: "setTargetPower", watts: 220 },
      "workout",
      { priority: "immediate", delivery: "acknowledged" }
    )

    harness.dispatch.mockClear()
    harness.setElapsedSeconds(60)
    await controller.setDifficultyPercent(90)
    expect(controller.getState()).toMatchObject({
      activeSegmentIndex: 1,
      difficultyPercent: 90,
      targetWatts: 135,
    })
    expect(harness.dispatch).toHaveBeenLastCalledWith(
      { type: "setTargetPower", watts: 135 },
      "workout",
      { priority: "immediate", delivery: "acknowledged" }
    )
  })

  it("clamps difficulty values to the supported range", async () => {
    const harness = createSessionHarness()
    const controller = createWorkoutController({ session: harness.session })

    await controller.setDifficultyPercent(10)
    expect(controller.getState().difficultyPercent).toBe(50)

    await controller.setDifficultyPercent(200)
    expect(controller.getState().difficultyPercent).toBe(150)
  })

  it("resetDifficultyPercent restores baseline and dispatches the baseline target", async () => {
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
    await controller.setDifficultyPercent(125)

    harness.dispatch.mockClear()
    await expect(controller.resetDifficultyPercent()).resolves.toEqual({
      ok: true,
    })

    expect(controller.getState()).toMatchObject({
      difficultyPercent: 100,
      targetWatts: 200,
    })
    expect(harness.dispatch).toHaveBeenCalledWith(
      { type: "setTargetPower", watts: 200 },
      "workout",
      { priority: "immediate", delivery: "acknowledged" }
    )
  })

  it("updates difficulty without immediate dispatch when telemetry is stale or disconnected", async () => {
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
    harness.setTelemetryStatus("stale")
    await controller.setDifficultyPercent(105)
    expect(controller.getState()).toMatchObject({
      difficultyPercent: 105,
      targetWatts: 210,
    })
    expect(harness.dispatch).not.toHaveBeenCalled()

    harness.setTelemetryStatus("fresh")
    harness.setTrainerConnected(false)
    await controller.setDifficultyPercent(106)
    expect(controller.getState()).toMatchObject({
      difficultyPercent: 106,
      targetWatts: 212,
    })
    expect(harness.dispatch).not.toHaveBeenCalled()
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
      "workout",
      undefined
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
      { priority: "immediate", delivery: "acknowledged" }
    )
  })

  it("continues dispatching scaled targets during periodic updates after difficulty changes", async () => {
    const harness = createSessionHarness({ telemetryStatus: "fresh" })
    const controller = createWorkoutController({
      session: harness.session,
      dispatchIntervalSeconds: 1,
    })
    await controller.loadWorkout(
      {
        id: "w1",
        title: "Workout",
        powerMode: "percentage",
        intervals: [{ startPower: 100, endPower: 100, durationSeconds: 60 }],
      },
      200
    )
    await controller.setDifficultyPercent(110)

    harness.dispatch.mockClear()
    harness.setElapsedSeconds(1)
    harness.tick()

    expect(harness.dispatch).toHaveBeenCalledWith(
      { type: "setTargetPower", watts: 220 },
      "workout",
      { priority: "normal", delivery: "enqueued" }
    )
  })

  it("clearWorkout resets difficulty to baseline", async () => {
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
    await controller.setDifficultyPercent(120)

    controller.clearWorkout()

    expect(controller.getState()).toMatchObject({
      activeWorkoutId: null,
      difficultyPercent: 100,
    })
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
      "workout",
      undefined
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
      dispatchImpl: vi.fn((command) =>
        Promise.resolve(
          command.type === "setMode" && command.mode === "free"
            ? { ok: false, reason: "transport" }
            : { ok: true }
        )
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

  it("ignores stale target dispatch completion after clearWorkout", async () => {
    let resolveDispatch!: (value: { ok: true }) => void
    const dispatch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
      .mockImplementationOnce(
        () =>
          new Promise<{ ok: true }>((resolve) => {
            resolveDispatch = resolve
          })
      )
      .mockResolvedValueOnce({ ok: true })
    const harness = createSessionHarness({ dispatchImpl: dispatch })
    const controller = createWorkoutController({ session: harness.session })

    await controller.loadWorkout(
      {
        id: "w1",
        title: "Workout",
        powerMode: "percentage",
        intervals: [
          { startPower: 100, endPower: 100, durationSeconds: 1 },
          { startPower: 150, endPower: 150, durationSeconds: 10 },
        ],
      },
      200
    )

    harness.setElapsedSeconds(1)
    harness.tick()
    controller.clearWorkout()
    resolveDispatch({ ok: true })
    await Promise.resolve()

    expect(controller.getState()).toEqual({
      activeWorkoutId: null,
      activeSegmentLabel: null,
      activeSegmentIndex: null,
      targetWatts: null,
      difficultyPercent: 100,
      isActive: false,
      elapsedSeconds: 0,
      totalDurationSeconds: 0,
      isComplete: false,
      controlStatus: "idle",
      lastError: null,
    })
  })

  it("preserves complete state if free-mode dispatch fails after completion", async () => {
    const dispatch = vi.fn((command) =>
      Promise.resolve(
        command.type === "setMode" && command.mode === "free"
          ? { ok: false, reason: "transport" }
          : { ok: true }
      )
    )
    const harness = createSessionHarness({ dispatchImpl: dispatch })
    const controller = createWorkoutController({ session: harness.session })

    await controller.loadWorkout(
      {
        id: "w1",
        title: "Workout",
        powerMode: "percentage",
        intervals: [{ startPower: 100, endPower: 100, durationSeconds: 1 }],
      },
      200
    )

    harness.setElapsedSeconds(2)
    harness.tick()
    await vi.waitFor(() => {
      expect(controller.getState().isComplete).toBe(true)
    })

    expect(controller.getState()).toMatchObject({
      isComplete: true,
      controlStatus: "complete",
      lastError: "transport",
    })
  })

  it("sets controlStatus to error when dispatch rejects then clears on success", async () => {
    let callCount = 0
    const dispatch = vi.fn(() => {
      callCount++
      // First two calls are setMode and setTargetPower during loadWorkout
      if (callCount <= 2) return Promise.resolve({ ok: true } as const)
      // Third call rejects
      if (callCount === 3) return Promise.reject(new Error("transient failure"))
      // Fourth call succeeds
      return Promise.resolve({ ok: true } as const)
    })
    const harness = createSessionHarness({ dispatchImpl: dispatch })
    const controller = createWorkoutController({
      session: harness.session,
      dispatchIntervalSeconds: 1,
    })
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

    // Advance to trigger periodic dispatch that will reject
    harness.setElapsedSeconds(1)
    harness.tick()
    // Wait for the rejection to be processed
    await vi.waitFor(() => {
      expect(controller.getState().controlStatus).toBe("error")
    })
    expect(controller.getState().lastError).toBe("transient failure")

    // Advance to trigger another dispatch that succeeds
    harness.setElapsedSeconds(2)
    harness.tick()
    await vi.waitFor(() => {
      expect(controller.getState().controlStatus).toBe("active")
    })
    expect(controller.getState().lastError).toBeNull()
  })

  it("stops dispatch when trainer disconnects and resumes on reconnect", async () => {
    const harness = createSessionHarness({ trainerConnected: true })
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

    // Disconnect trainer and advance to segment change
    harness.setTrainerConnected(false)
    harness.setElapsedSeconds(11)
    harness.tick()

    // Should not dispatch while disconnected
    expect(harness.dispatch).not.toHaveBeenCalled()

    // Reconnect trainer
    harness.setTrainerConnected(true)
    harness.tick()

    // Now it should dispatch
    expect(harness.dispatch).toHaveBeenCalledWith(
      { type: "setTargetPower", watts: 300 },
      "workout",
      { priority: "immediate", delivery: "acknowledged" }
    )
  })

  it("seeks by updating elapsed state and dispatching one immediate target", async () => {
    const harness = createSessionHarness()
    const controller = createWorkoutController({ session: harness.session })
    await controller.loadWorkout(
      {
        id: "w1",
        title: "Workout",
        powerMode: "percentage",
        intervals: [
          { startPower: 100, endPower: 100, durationSeconds: 30 },
          { startPower: 150, endPower: 150, durationSeconds: 30 },
        ],
      },
      200
    )

    harness.dispatch.mockClear()
    harness.setElapsedSeconds(100)
    await expect(controller.seekToElapsedSeconds(35)).resolves.toEqual({
      ok: true,
    })

    expect(controller.getState()).toMatchObject({
      elapsedSeconds: 35,
      activeSegmentIndex: 1,
      targetWatts: 300,
      isComplete: false,
    })
    expect(harness.dispatch).toHaveBeenCalledTimes(1)
    expect(harness.dispatch).toHaveBeenCalledWith(
      { type: "setTargetPower", watts: 300 },
      "workout",
      { priority: "immediate", delivery: "acknowledged" }
    )
  })

  it("clamps seeks to the workout duration", async () => {
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
    await controller.seekToElapsedSeconds(100)

    expect(controller.getState()).toMatchObject({
      elapsedSeconds: 30,
      activeSegmentIndex: 0,
      isComplete: false,
    })
  })

  it("does not dispatch seek targets while telemetry is stale", async () => {
    const harness = createSessionHarness({ telemetryStatus: "stale" })
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
    await expect(controller.seekToElapsedSeconds(10)).resolves.toEqual({
      ok: true,
    })

    expect(harness.dispatch).not.toHaveBeenCalled()
  })

  it("does not dispatch seek targets while the trainer is disconnected", async () => {
    const harness = createSessionHarness({ trainerConnected: false })
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
    await controller.seekToElapsedSeconds(10)

    expect(harness.dispatch).not.toHaveBeenCalled()
  })

  it("interpolates ramp targets when seeking", async () => {
    const harness = createSessionHarness()
    const controller = createWorkoutController({ session: harness.session })
    await controller.loadWorkout(
      {
        id: "w1",
        title: "Workout",
        powerMode: "percentage",
        intervals: [{ startPower: 50, endPower: 100, durationSeconds: 60 }],
      },
      200
    )

    harness.dispatch.mockClear()
    await controller.seekToElapsedSeconds(30)

    expect(controller.getState().targetWatts).toBe(150)
    expect(harness.dispatch).toHaveBeenCalledWith(
      { type: "setTargetPower", watts: 150 },
      "workout",
      { priority: "immediate", delivery: "acknowledged" }
    )
  })

  it("ignores stale dispatch failure after a newer workout starts", async () => {
    let rejectFirstUpdate!: (error: unknown) => void
    const dispatch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
      .mockImplementationOnce(
        () =>
          new Promise<never>((_, reject) => {
            rejectFirstUpdate = reject
          })
      )
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
    const harness = createSessionHarness({ dispatchImpl: dispatch })
    const controller = createWorkoutController({ session: harness.session })

    await controller.loadWorkout(
      {
        id: "w1",
        title: "Workout 1",
        powerMode: "percentage",
        intervals: [
          { startPower: 100, endPower: 100, durationSeconds: 1 },
          { startPower: 150, endPower: 150, durationSeconds: 10 },
        ],
      },
      200
    )

    harness.setElapsedSeconds(1)
    harness.tick()

    await controller.loadWorkout(
      {
        id: "w2",
        title: "Workout 2",
        powerMode: "percentage",
        intervals: [{ startPower: 120, endPower: 120, durationSeconds: 10 }],
      },
      200
    )

    rejectFirstUpdate(new Error("stale failure"))
    await Promise.resolve()

    expect(controller.getState()).toMatchObject({
      activeWorkoutId: "w2",
      controlStatus: "active",
      lastError: null,
    })
  })
})
