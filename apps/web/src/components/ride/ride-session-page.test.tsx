// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { MockTrainer } from "@ramp/trainer-io"
import type { RideGameDefinition } from "@/games/types"
import { RideGameNotFound } from "./ride-game-not-found"
import { RideSessionPage } from "./ride-session-page"

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>(
      "@tanstack/react-router"
    )

  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: {
      children: React.ReactNode
      to: string
      [key: string]: unknown
    }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  }
})

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

vi.mock("@/ride/use-ride-trainer", () => ({
  useRideTrainer: () => testTrainer,
}))

const countrysideGame: RideGameDefinition = {
  id: "countryside-r3f",
  displayName: "Countryside",
  description: "Test countryside definition",
  tags: ["3D scenery"],
  accent: {
    from: "#d7f0c7",
    to: "#66a36f",
    ink: "#132018",
  },
  preview: {
    eyebrow: "Open roads",
    spotlight: "Reactive R3F scenery",
  },
  plugin: {
    id: "countryside-r3f",
    displayName: "Countryside",
    GameView: () => <div data-testid="ride-canvas" />,
  },
}

describe("RideSessionPage", () => {
  it("renders the selected game inside the shared ride shell", () => {
    const { container } = render(<RideSessionPage game={countrysideGame} />)

    expect(screen.getByTestId("ride-canvas")).toBeTruthy()
    expect(container.textContent).toContain("Simulator")
    expect(container.textContent).toContain("Countryside")
  })

  it("updates current watts from the power slider", async () => {
    const { container } = render(<RideSessionPage game={countrysideGame} />)

    testTrainer.setManualOverrides({ powerWatts: 240 })

    await waitFor(() => expect(container.textContent).toContain("240 W"))
  })

  it("pause stops elapsed and distance advancement", () => {
    vi.useFakeTimers()
    const { container } = render(<RideSessionPage game={countrysideGame} />)

    fireEvent.click(screen.getByLabelText("Pause ride"))

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(container.textContent).toContain("0:00")
    expect(container.textContent).toContain("0.00 km")
    vi.useRealTimers()
  })

  it("follow workout mode displays a target watt value", () => {
    const { container } = render(<RideSessionPage game={countrysideGame} />)
    const followWorkoutButton = Array.from(
      container.querySelectorAll("button")
    ).find((button) => button.textContent === "Follow Workout")

    expect(followWorkoutButton).toBeTruthy()
    fireEvent.click(followWorkoutButton!)

    expect(container.textContent).toContain("220 W")
    expect(container.textContent).toContain("Threshold")
  })
})

describe("RideGameNotFound", () => {
  it("renders an invalid game state", () => {
    const { container } = render(<RideGameNotFound gameId="missing-game" />)

    expect(container.textContent).toContain("missing-game")
    expect(container.textContent).toContain("Back to games")
  })
})
