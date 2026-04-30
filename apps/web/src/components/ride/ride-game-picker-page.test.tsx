// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RideGamePickerPage } from "./ride-game-picker-page"

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

vi.mock("@ramp/game-countryside-r3f", () => ({
  countrysideGame: {
    id: "countryside-r3f",
    displayName: "Countryside",
    GameView: () => null,
  },
}))

vi.mock("@ramp/game-hill-climb", () => ({
  hillClimbGame: {
    id: "hill-climb",
    displayName: "Hill Climb",
    GameView: () => null,
  },
}))

describe("RideGamePickerPage", () => {
  it("renders cards for each registered ride game in both variant sections", () => {
    render(<RideGamePickerPage />)

    // Each game appears once in the Preview Tile grid and once in the
    // Stacked Rows list, so we expect two occurrences of each name.
    expect(screen.getAllByText("Countryside")).toHaveLength(2)
    expect(screen.getAllByText("Hill Climb")).toHaveLength(2)
  })
})
