import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { MockTrainer } from "@ramp/trainer-io"
import { RidePage } from "./ride-page"

const testTrainer = new MockTrainer()

const workouts = [
  {
    _id: "workout-1",
    _creationTime: 1,
    title: "Ramp Test",
    intervalsRevision: 0,
    intervals: [
      {
        startPower: 110,
        endPower: 110,
        durationSeconds: 60,
        comment: "Threshold",
      },
    ],
    summary: {
      totalDurationSeconds: 60,
      stressScore: 12,
    },
  },
]

vi.mock("#convex/_generated/api", () => ({
  api: {
    settings: { get: "settings.get" },
    workouts: { list: "workouts.list" },
  },
}))

vi.mock("convex/react", () => ({
  useQuery: vi.fn((query) => {
    if (query === "settings.get") {
      return { ftp: 200, powerDisplayMode: "percentage" }
    }
    return workouts
  }),
}))

vi.mock("@ramp/game-countryside-r3f", () => ({
  countrysideGame: {
    id: "countryside-r3f",
    displayName: "Countryside",
    GameView: () => <div data-testid="ride-canvas" />,
  },
}))

vi.mock("@/ride/use-ride-trainer", () => ({
  useRideTrainer: () => testTrainer,
}))

describe("RidePage", () => {
  it("renders the ride route experience", () => {
    const { container } = render(<RidePage />)

    expect(screen.getByTestId("ride-canvas")).toBeTruthy()
    expect(container.textContent).toContain("Simulator")
  })

  it("shows the simulator source", () => {
    const { container } = render(<RidePage />)

    expect(container.textContent).toContain("Source")
    expect(container.textContent).toContain("Simulator")
  })

  it("updates current watts from the power slider", async () => {
    const { container } = render(<RidePage />)

    testTrainer.setManualOverrides({ powerWatts: 240 })

    await waitFor(() => expect(container.textContent).toContain("240 W"))
  })

  it("pause stops elapsed and distance advancement", () => {
    vi.useFakeTimers()
    const { container } = render(<RidePage />)

    fireEvent.click(screen.getByLabelText("Pause ride"))

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(container.textContent).toContain("0:00")
    expect(container.textContent).toContain("0.00 km")
    vi.useRealTimers()
  })

  it("follow workout mode displays a target watt value", () => {
    const { container } = render(<RidePage />)
    const followWorkoutButton = Array.from(
      container.querySelectorAll("button")
    ).find((button) => button.textContent === "Follow Workout")

    expect(followWorkoutButton).toBeTruthy()
    fireEvent.click(followWorkoutButton!)

    expect(container.textContent).toContain("220 W")
    expect(container.textContent).toContain("Threshold")
  })
})
