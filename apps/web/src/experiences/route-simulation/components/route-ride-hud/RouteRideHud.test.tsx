import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RouteRideHud } from "./RouteRideHud"

const defaultProps = {
  distanceMeters: 1000,
  elapsedSeconds: 120,
  gradePercent: 4.2,
  isPaused: false,
  onPause: vi.fn(),
  onResume: vi.fn(),
  onSmoothingChange: vi.fn(),
  onStop: vi.fn(),
  smoothingLevel: 5,
  speedKph: 18.4,
  telemetryStatus: "fresh" as const,
  totalDistanceMeters: 5000,
}

describe("RouteRideHud", () => {
  it("labels app physics speed as virtual speed", () => {
    render(<RouteRideHud {...defaultProps} speedSource="physics" />)

    expect(screen.getByText("Virtual speed")).toBeTruthy()
    expect(screen.getByText("18.4 km/h")).toBeTruthy()
  })

  it("shows power missing status when app physics is waiting for power", () => {
    render(
      <RouteRideHud
        {...defaultProps}
        speedKph={0}
        speedSource="paused-power-missing"
      />
    )

    expect(screen.getByText("Power missing")).toBeTruthy()
    expect(screen.getByText("Power required")).toBeTruthy()
  })
})
