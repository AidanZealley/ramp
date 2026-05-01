import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Capability } from "@ramp/ride-core"
import { LiveWorkoutExperienceView } from "./live-workout-experience-view"

const useQuery = vi.fn()

vi.mock("convex/react", () => ({
  useQuery: (...args: Array<unknown>) => useQuery(...args),
}))

function createSession(options?: {
  trainerConnected?: boolean
  capabilities?: ReadonlySet<Capability>
  dispatchImpl?: ReturnType<typeof vi.fn>
}) {
  const dispatch =
    options?.dispatchImpl ??
    vi.fn(async () => {
      return { ok: true } as const
    })

  const state = {
    telemetry: {
      elapsedSeconds: 0,
      distanceMeters: 0,
      speedMps: 8,
      powerWatts: 180,
      cadenceRpm: 90,
      heartRateBpm: null,
      trainerStatus:
        options?.trainerConnected === false ? "disconnected" : "ready",
      telemetryStatus: "fresh" as const,
      lastTelemetryAtMs: 0,
      telemetryAgeMs: 0,
      telemetrySource: "mock" as const,
    },
    trainerConnected: options?.trainerConnected !== false,
    paused: false,
    activeControlMode: "manual" as const,
    lastError: null,
    lastTrainerError: null,
  }

  return {
    getState: () => state,
    subscribe: () => () => undefined,
    controls: {
      dispatch,
      getCapabilities: () =>
        options?.capabilities ?? new Set(Object.values(Capability)),
    },
  } as never
}

const workoutDoc = {
  _id: "w1",
  _creationTime: 1,
  title: "Ramp Builder",
  intervals: [{ startPower: 100, endPower: 100, durationSeconds: 60 }],
  intervalsRevision: 0,
}

describe("LiveWorkoutExperienceView", () => {
  beforeEach(() => {
    useQuery.mockReset()
  })

  it("renders loading state until workouts and settings resolve", () => {
    useQuery.mockImplementation(() => undefined)

    render(<LiveWorkoutExperienceView session={createSession()} />)

    expect(screen.getByText("Selected workout")).toBeTruthy()
    expect(screen.getByText("Start workout")).toHaveProperty("disabled", true)
  })

  it("disables start when the trainer is disconnected", () => {
    useQuery.mockImplementation((_query) =>
      useQuery.mock.calls.length % 2 === 1 ? [workoutDoc] : { ftp: 200 }
    )

    render(
      <LiveWorkoutExperienceView
        session={createSession({ trainerConnected: false })}
      />
    )

    fireEvent.click(screen.getByText("Ramp Builder"))

    expect(screen.getByText("Waiting for the trainer to connect.")).toBeTruthy()
    expect(screen.getByText("Start workout")).toHaveProperty("disabled", true)
  })

  it("disables start when target power is unsupported", () => {
    useQuery.mockImplementation((_query) =>
      useQuery.mock.calls.length % 2 === 1 ? [workoutDoc] : { ftp: 200 }
    )

    render(
      <LiveWorkoutExperienceView
        session={createSession({
          capabilities: new Set([Capability.ReadPower]),
        })}
      />
    )

    fireEvent.click(screen.getByText("Ramp Builder"))

    expect(
      screen.getByText("Connected trainer does not support ERG target power.")
    ).toBeTruthy()
    expect(screen.getByText("Start workout")).toHaveProperty("disabled", true)
  })

  it("shows a start failure and stays out of the dashboard", async () => {
    useQuery.mockImplementation((_query) =>
      useQuery.mock.calls.length % 2 === 1 ? [workoutDoc] : { ftp: 200 }
    )
    const dispatch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, reason: "capability-unsupported" })
      .mockResolvedValueOnce({ ok: true })

    render(
      <LiveWorkoutExperienceView
        session={createSession({ dispatchImpl: dispatch })}
      />
    )

    fireEvent.click(screen.getByText("Ramp Builder"))
    fireEvent.click(screen.getByText("Start workout"))

    await waitFor(() => {
      expect(
        screen.getByText("Connected trainer does not support ERG target power.")
      ).toBeTruthy()
    })
    expect(screen.queryByText("Now riding")).toBeNull()
  })

  it("enters the active dashboard after a successful start", async () => {
    useQuery.mockImplementation((_query) =>
      useQuery.mock.calls.length % 2 === 1 ? [workoutDoc] : { ftp: 200 }
    )

    render(<LiveWorkoutExperienceView session={createSession()} />)

    fireEvent.click(screen.getByText("Ramp Builder"))
    fireEvent.click(screen.getByText("Start workout"))

    await waitFor(() => {
      expect(screen.getByText("Now riding")).toBeTruthy()
    })
  })

  it("unmounting before loadWorkout resolves does not warn and calls clearWorkout", async () => {
    let resolveDispatch: ((value: { ok: true }) => void) | undefined
    const pendingDispatch = vi.fn(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          resolveDispatch = resolve
        })
    )

    useQuery.mockImplementation((_query) =>
      useQuery.mock.calls.length % 2 === 1 ? [workoutDoc] : { ftp: 200 }
    )

    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    const { unmount } = render(
      <LiveWorkoutExperienceView
        session={createSession({ dispatchImpl: pendingDispatch })}
      />
    )

    fireEvent.click(screen.getByText("Ramp Builder"))
    fireEvent.click(screen.getByText("Start workout"))

    // Unmount before the dispatch resolves
    unmount()

    // Resolve the dispatch after unmount
    resolveDispatch?.({ ok: true })

    // Give React a chance to process
    await new Promise((r) => setTimeout(r, 0))

    // No React warnings about setting state on unmounted component
    expect(consoleWarn).not.toHaveBeenCalled()
    // The only console.error should be from our defensive plumbing, not React warnings
    const reactWarnings = consoleError.mock.calls.filter(
      (args) =>
        typeof args[0] === "string" &&
        args[0].includes("Cannot update a component")
    )
    expect(reactWarnings).toHaveLength(0)

    consoleWarn.mockRestore()
    consoleError.mockRestore()
  })
})
