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
    useNavigate: () => vi.fn(),
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
    expect(container.textContent).toContain("Countryside")
  })

  it("updates current watts from the HUD", async () => {
    render(<RideSessionPage game={countrysideGame} />)

    fireEvent.click(screen.getByLabelText("Show ride overlay panels"))

    testTrainer.setManualOverrides({ powerWatts: 240 })

    await waitFor(() =>
      expect(screen.getAllByText("240 W").length).toBeGreaterThan(0)
    )
  })

  it("pause stops elapsed and distance advancement", () => {
    vi.useFakeTimers()
    render(<RideSessionPage game={countrysideGame} />)

    fireEvent.click(screen.getByLabelText("Show ride overlay panels"))
    fireEvent.click(screen.getByRole("tab", { name: "Controls" }))
    fireEvent.click(screen.getByLabelText("Pause ride"))
    fireEvent.click(screen.getByRole("tab", { name: "HUD" }))

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.getByText("0:00")).toBeTruthy()
    expect(screen.getByText("0.00 km")).toBeTruthy()
    vi.useRealTimers()
  })

  it("renders manual simulator controls", () => {
    render(<RideSessionPage game={countrysideGame} />)

    fireEvent.click(screen.getByLabelText("Show ride overlay panels"))
    fireEvent.click(screen.getByRole("tab", { name: "Controls" }))

    expect(screen.getByText("Manual inputs")).toBeTruthy()
    expect(screen.getByText("Power")).toBeTruthy()
    expect(screen.getByText("Cadence")).toBeTruthy()
  })
})

describe("RideGameNotFound", () => {
  it("renders an invalid game state", () => {
    const { container } = render(<RideGameNotFound gameId="missing-game" />)

    expect(container.textContent).toContain("missing-game")
    expect(container.textContent).toContain("Back to games")
  })
})
