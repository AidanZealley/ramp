import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RouteRideHud } from "./RouteRideHud"

const onTerrainEnabledChange = vi.fn()
const onViewModeChange = vi.fn()

const defaultProps = {
  distanceMeters: 1000,
  elapsedSeconds: 120,
  gradePercent: 4.2,
  isPaused: false,
  onPause: vi.fn(),
  onResume: vi.fn(),
  onSmoothingChange: vi.fn(),
  onStop: vi.fn(),
  onTerrainEnabledChange,
  onViewModeChange,
  smoothingLevel: 5,
  speedKph: 18.4,
  telemetryStatus: "fresh" as const,
  totalDistanceMeters: 5000,
  terrainEnabled: false,
  viewMode: "top-down" as const,
}

describe("RouteRideHud", () => {
  beforeEach(() => {
    onTerrainEnabledChange.mockClear()
    onViewModeChange.mockClear()
  })

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

  it("renders view mode controls", () => {
    render(<RouteRideHud {...defaultProps} speedSource="trainer" />)

    expect(screen.queryByRole("group", { name: "Map view mode" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Route settings" }))

    expect(screen.getByRole("group", { name: "Map view mode" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Top-down map view" })).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Perspective map view" })
    ).toBeTruthy()
    expect(screen.getByText("Terrain")).toBeTruthy()
  })

  it("selecting perspective changes view mode", () => {
    render(<RouteRideHud {...defaultProps} speedSource="trainer" />)

    fireEvent.click(screen.getByRole("button", { name: "Route settings" }))
    fireEvent.click(screen.getByRole("button", { name: "Perspective map view" }))

    expect(onViewModeChange).toHaveBeenCalledWith("perspective")
  })

  it("selecting top-down changes view mode", () => {
    render(
      <RouteRideHud
        {...defaultProps}
        speedSource="trainer"
        viewMode="perspective"
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Route settings" }))
    fireEvent.click(screen.getByRole("button", { name: "Top-down map view" }))

    expect(onViewModeChange).toHaveBeenCalledWith("top-down")
  })

  it("toggling terrain calls terrain change handler", () => {
    render(<RouteRideHud {...defaultProps} speedSource="trainer" />)

    fireEvent.click(screen.getByRole("button", { name: "Route settings" }))
    fireEvent.click(screen.getByRole("switch"))

    expect(onTerrainEnabledChange).toHaveBeenCalledWith(true)
  })
})
