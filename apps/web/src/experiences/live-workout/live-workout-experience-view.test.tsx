import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Capability } from "@ramp/ride-core"
import { LiveWorkoutExperienceView } from "./live-workout-experience-view"
import {
  getCompletedIntervalCount,
  getIntervalBounds,
  getIntervalRemainingSeconds,
} from "./components/live-workout-dashboard/utils"
import type React from "react"

const useQuery = vi.fn()
const confettiRender = vi.hoisted(() => vi.fn())

vi.mock("react-confetti", () => ({
  default: (props: Record<string, unknown>) => {
    confettiRender(props)
    return <div data-testid="completion-confetti" />
  },
}))

vi.mock("convex/react", () => ({
  useQuery: (...args: Array<unknown>) => useQuery(...args),
}))

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    to,
    ...props
  }: {
    children: React.ReactNode
    params?: Record<string, string>
    to: string
  }) => {
    const href = params
      ? Object.entries(params).reduce(
          (path, [key, value]) => path.replace(`$${key}`, value),
          to
        )
      : to
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))

function createSession(options?: {
  trainerConnected?: boolean
  capabilities?: ReadonlySet<Capability>
  dispatchImpl?: ReturnType<typeof vi.fn>
  pauseImpl?: ReturnType<typeof vi.fn>
  resumeImpl?: ReturnType<typeof vi.fn>
  telemetrySource?: "simulated" | "ftms-ble" | "wahoo-kickr-ble" | "ant" | null
  elapsedSeconds?: number
  distanceMeters?: number
  powerWatts?: number | null
  cadenceRpm?: number | null
  heartRateBpm?: number | null
}) {
  const dispatch =
    options?.dispatchImpl ?? vi.fn(() => Promise.resolve({ ok: true } as const))
  const listeners = new Set<() => void>()

  const state = {
    telemetry: {
      elapsedSeconds: options?.elapsedSeconds ?? 0,
      distanceMeters: options?.distanceMeters ?? 0,
      speedMps: 8,
      powerWatts: options?.powerWatts ?? 180,
      cadenceRpm: options?.cadenceRpm ?? 90,
      heartRateBpm: options?.heartRateBpm ?? null,
      trainerStatus:
        options?.trainerConnected === false ? "disconnected" : "ready",
      telemetryStatus: "fresh" as const,
      lastTelemetryAtMs: 0,
      telemetryAgeMs: 0,
      telemetrySource: options?.telemetrySource ?? "ftms-ble",
    },
    trainerConnected: options?.trainerConnected !== false,
    paused: false,
    activeControlMode: "manual" as const,
    lastError: null,
    lastTrainerError: null,
  }

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    pause: vi.fn(() => {
      options?.pauseImpl?.()
      state.paused = true
      listeners.forEach((listener) => listener())
    }),
    resume: vi.fn(() => {
      options?.resumeImpl?.()
      state.paused = false
      listeners.forEach((listener) => listener())
    }),
    controls: {
      dispatch,
      getCapabilities: () =>
        options?.capabilities ?? new Set(Object.values(Capability)),
    },
    setTelemetry: (
      telemetry: Partial<{
        elapsedSeconds: number
        distanceMeters: number
      }>
    ) => {
      Object.assign(state.telemetry, telemetry)
      listeners.forEach((listener) => listener())
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
    confettiRender.mockClear()
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

    expect(
      screen.getByText("Connect a trainer or use the simulator to start.")
    ).toBeTruthy()
    expect(screen.getByText("Start workout")).toHaveProperty("disabled", true)
  })

  it("shows simulator ready copy when the simulated trainer can start", () => {
    useQuery.mockImplementation((_query) =>
      useQuery.mock.calls.length % 2 === 1 ? [workoutDoc] : { ftp: 200 }
    )

    render(
      <LiveWorkoutExperienceView
        session={createSession({ telemetrySource: "simulated" })}
      />
    )

    fireEvent.click(screen.getByText("Ramp Builder"))

    expect(screen.getByText("Simulator ready for ERG workout.")).toBeTruthy()
    expect(screen.getByText("Start workout")).toHaveProperty("disabled", false)
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

  it("renders the active dashboard metrics after a successful start", async () => {
    useQuery.mockImplementation((_query) =>
      useQuery.mock.calls.length % 2 === 1 ? [workoutDoc] : { ftp: 200 }
    )

    render(<LiveWorkoutExperienceView session={createSession()} />)

    fireEvent.click(screen.getByText("Ramp Builder"))
    fireEvent.click(screen.getByText("Start workout"))

    await waitFor(() => {
      expect(screen.getByText("Now riding")).toBeTruthy()
    })
    expect(screen.getByText("Ramp Builder")).toBeTruthy()
    expect(screen.getByTestId("target-power").textContent).toContain("200W")
    expect(screen.getByTestId("rider-power").textContent).toContain("180W")
    expect(screen.getByTestId("current-interval-timer").textContent).toContain(
      "1:00"
    )
    expect(screen.getByTestId("workout-remaining-timer").textContent).toContain(
      "1:00"
    )
    expect(screen.getByText("Not connected")).toBeTruthy()
    expect(screen.getByText("90 rpm")).toBeTruthy()
    expect(screen.getByText("0/1 intervals completed")).toBeTruthy()
    expect(screen.getByLabelText("Workout interval shape")).toBeTruthy()
    expect(screen.getByTestId("workout-progress-line")).toBeTruthy()
  })

  it("opens the completion dialog once with the frozen workout summary", async () => {
    useQuery.mockImplementation((_query) =>
      useQuery.mock.calls.length % 2 === 1 ? [workoutDoc] : { ftp: 200 }
    )
    const session = createSession() as unknown as {
      setTelemetry: (telemetry: {
        elapsedSeconds: number
        distanceMeters: number
      }) => void
    }

    render(<LiveWorkoutExperienceView session={session as never} />)

    fireEvent.click(screen.getByText("Ramp Builder"))
    fireEvent.click(screen.getByText("Start workout"))

    await waitFor(() => {
      expect(screen.getByText("Now riding")).toBeTruthy()
    })

    act(() => {
      session.setTelemetry({ elapsedSeconds: 61, distanceMeters: 1234 })
    })

    await waitFor(() => {
      expect(screen.getByText("Workout complete!")).toBeTruthy()
    })
    expect(screen.getByText(/Ramp Builder is complete/)).toBeTruthy()
    expect(screen.getByText("1:00")).toBeTruthy()
    expect(screen.getByText("1.23 km")).toBeTruthy()
    expect(screen.getByTestId("completion-confetti")).toBeTruthy()
    expect(confettiRender).toHaveBeenCalled()

    act(() => {
      session.setTelemetry({ elapsedSeconds: 62, distanceMeters: 1300 })
    })

    expect(screen.getAllByText("Workout complete!")).toHaveLength(1)
    expect(screen.getByText("1.23 km")).toBeTruthy()
  })

  it("links completion dialog actions to edit workout and ride routes", async () => {
    useQuery.mockImplementation((_query) =>
      useQuery.mock.calls.length % 2 === 1 ? [workoutDoc] : { ftp: 200 }
    )
    const session = createSession() as unknown as {
      setTelemetry: (telemetry: {
        elapsedSeconds: number
        distanceMeters: number
      }) => void
    }

    render(<LiveWorkoutExperienceView session={session as never} />)

    fireEvent.click(screen.getByText("Ramp Builder"))
    fireEvent.click(screen.getByText("Start workout"))

    await waitFor(() => {
      expect(screen.getByText("Now riding")).toBeTruthy()
    })

    act(() => {
      session.setTelemetry({ elapsedSeconds: 61, distanceMeters: 842 })
    })

    await waitFor(() => {
      expect(screen.getByText("Workout complete!")).toBeTruthy()
    })
    expect(screen.getByText("842 m")).toBeTruthy()

    expect(
      screen.getByRole("link", { name: "Edit workout" }).getAttribute("href")
    ).toBe("/workout/w1")
    expect(
      screen.getByRole("link", { name: "Back to rides" }).getAttribute("href")
    ).toBe("/ride")
  })

  it("closing the completion dialog keeps the completed workout visible", async () => {
    useQuery.mockImplementation((_query) =>
      useQuery.mock.calls.length % 2 === 1 ? [workoutDoc] : { ftp: 200 }
    )
    const session = createSession() as unknown as {
      setTelemetry: (telemetry: {
        elapsedSeconds: number
        distanceMeters: number
      }) => void
    }

    render(<LiveWorkoutExperienceView session={session as never} />)

    fireEvent.click(screen.getByText("Ramp Builder"))
    fireEvent.click(screen.getByText("Start workout"))

    await waitFor(() => {
      expect(screen.getByText("Now riding")).toBeTruthy()
    })

    act(() => {
      session.setTelemetry({ elapsedSeconds: 61, distanceMeters: 842 })
    })

    await waitFor(() => {
      expect(screen.getByText("Workout complete!")).toBeTruthy()
    })

    fireEvent.click(screen.getByText("Close"))

    await waitFor(() => {
      expect(screen.queryByText("Workout complete!")).toBeNull()
    })
    expect(screen.getAllByText("Complete").length).toBeGreaterThan(0)
    expect(screen.getByText("Ramp Builder")).toBeTruthy()
    expect(screen.queryByText("Selected workout")).toBeNull()
  })

  it("pauses by default after loading a workout and exposes start/pause control", async () => {
    useQuery.mockImplementation((_query) =>
      useQuery.mock.calls.length % 2 === 1 ? [workoutDoc] : { ftp: 200 }
    )
    const pause = vi.fn()
    const resume = vi.fn()

    render(
      <LiveWorkoutExperienceView
        session={createSession({ pauseImpl: pause, resumeImpl: resume })}
      />
    )

    fireEvent.click(screen.getByText("Ramp Builder"))
    fireEvent.click(screen.getByText("Start workout"))

    await waitFor(() => {
      expect(pause).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByLabelText("Start workout")).toBeTruthy()

    fireEvent.click(screen.getByLabelText("Start workout"))

    expect(resume).toHaveBeenCalledTimes(1)
  })

  it("gates ending the workout behind a confirmation dialog", async () => {
    useQuery.mockImplementation((_query) =>
      useQuery.mock.calls.length % 2 === 1 ? [workoutDoc] : { ftp: 200 }
    )

    render(<LiveWorkoutExperienceView session={createSession()} />)

    fireEvent.click(screen.getByText("Ramp Builder"))
    fireEvent.click(screen.getByText("Start workout"))

    await waitFor(() => {
      expect(screen.getByText("Now riding")).toBeTruthy()
    })

    fireEvent.click(screen.getByLabelText("End workout"))

    expect(screen.getByText("End workout?")).toBeTruthy()
    expect(screen.getByText("Stay here")).toBeTruthy()
    expect(screen.getAllByText("End workout")).toHaveLength(1)

    fireEvent.click(screen.getByText("End workout"))

    await waitFor(() => {
      expect(screen.queryByText("Now riding")).toBeNull()
    })
    expect(screen.getByText("Selected workout")).toBeTruthy()
  })

  it("shows available heart rate in the active dashboard", async () => {
    useQuery.mockImplementation((_query) =>
      useQuery.mock.calls.length % 2 === 1 ? [workoutDoc] : { ftp: 200 }
    )

    render(
      <LiveWorkoutExperienceView
        session={createSession({ heartRateBpm: 145 })}
      />
    )

    fireEvent.click(screen.getByText("Ramp Builder"))
    fireEvent.click(screen.getByText("Start workout"))

    await waitFor(() => {
      expect(screen.getByText("145 bpm")).toBeTruthy()
    })
  })

  it("uses simulated telemetry power as rider power", async () => {
    useQuery.mockImplementation((_query) =>
      useQuery.mock.calls.length % 2 === 1 ? [workoutDoc] : { ftp: 200 }
    )

    render(
      <LiveWorkoutExperienceView
        session={createSession({
          telemetrySource: "simulated",
          powerWatts: 180,
        })}
      />
    )

    fireEvent.click(screen.getByText("Ramp Builder"))
    fireEvent.click(screen.getByText("Start workout"))

    await waitFor(() => {
      expect(screen.getByTestId("rider-power").textContent).toContain("180W")
    })
    expect(screen.getByText("Simulator")).toBeTruthy()
  })

  it("shows the current interval comment", async () => {
    useQuery.mockImplementation((_query) =>
      useQuery.mock.calls.length % 2 === 1
        ? [
            {
              ...workoutDoc,
              intervals: [
                {
                  startPower: 100,
                  endPower: 100,
                  durationSeconds: 60,
                  comment: "Settle in",
                },
              ],
            },
          ]
        : { ftp: 200 }
    )

    render(<LiveWorkoutExperienceView session={createSession()} />)

    fireEvent.click(screen.getByText("Ramp Builder"))
    fireEvent.click(screen.getByText("Start workout"))

    await waitFor(() => {
      expect(screen.getAllByText("Settle in").length).toBeGreaterThan(0)
    })
    expect(screen.getByText("Segment 1")).toBeTruthy()
  })

  it("calculates completed intervals and final interval warning timing", () => {
    const intervals = [
      { startPower: 100, endPower: 100, durationSeconds: 60 },
      { startPower: 120, endPower: 120, durationSeconds: 30 },
    ]

    expect(getCompletedIntervalCount(intervals, 0, false)).toBe(0)
    expect(getCompletedIntervalCount(intervals, 60, false)).toBe(1)
    expect(getCompletedIntervalCount(intervals, 1, true)).toBe(2)

    const bounds = getIntervalBounds(intervals, 0)
    expect(getIntervalRemainingSeconds(bounds, 55)).toBe(5)
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
