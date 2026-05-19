import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RouteRideHud } from "./RouteRideHud"

const onTerrainEnabledChange = vi.fn()
const onViewModeChange = vi.fn()

const defaultProps = {
  distanceMeters: 1000,
  elapsedSeconds: 120,
  gradeDiagnostics: {
    distanceMeters: 1000,
    smoothingMeters: 0,
    rawGradePercent: 4.2,
    smoothedGradePercent: 4.2,
    elevationMeters: 120,
  },
  gradePercent: 4.2,
  isPaused: false,
  lastGradeDispatch: {
    gradePercent: 4.2,
    distanceMeters: 950,
    atMs: 1000,
  },
  onPause: vi.fn(),
  onResume: vi.fn(),
  onSmoothingChange: vi.fn(),
  onStop: vi.fn(),
  onTerrainEnabledChange,
  onViewModeChange,
  powerWatts: 212,
  riderPosition: {
    lat: 51.5,
    lng: -0.12,
    elevationMeters: 120,
    distanceMeters: 1000,
  },
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

    expect(screen.getByText("Power")).toBeTruthy()
    expect(screen.getByText("212 W")).toBeTruthy()
    expect(screen.getByText("Virtual speed")).toBeTruthy()
    expect(screen.getByText("18.4 km/h")).toBeTruthy()
  })

  it("shows missing power when current power is unavailable", () => {
    render(
      <RouteRideHud
        {...defaultProps}
        powerWatts={null}
        speedSource="trainer"
      />
    )

    expect(screen.getByText("-- W")).toBeTruthy()
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

  it("shows smoothing as off at level 0 and meters for other levels", () => {
    const { rerender } = render(
      <RouteRideHud {...defaultProps} speedSource="trainer" smoothingLevel={0} />
    )

    fireEvent.click(screen.getByRole("button", { name: "Route settings" }))
    expect(screen.getByText("Off")).toBeTruthy()

    rerender(
      <RouteRideHud {...defaultProps} speedSource="trainer" smoothingLevel={3} />
    )

    expect(screen.getByText("20 m")).toBeTruthy()
  })

  it("renders route grade debug in dev", () => {
    render(<RouteRideHud {...defaultProps} speedSource="trainer" />)

    fireEvent.click(screen.getByRole("button", { name: "Route grade debug" }))

    expect(screen.getByText("Route distance")).toBeTruthy()
    expect(screen.getByText("Raw grade")).toBeTruthy()
    expect(screen.getByText("Trainer grade")).toBeTruthy()
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
