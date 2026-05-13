import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RideCockpit } from "./RideCockpit"
import type {
  RideRuntimeController,
  RideSimulatorControls,
} from "@/ride/use-ride-runtime"

const { useRideSimulatorControls } = vi.hoisted(() => ({
  useRideSimulatorControls: vi.fn(),
}))

vi.mock("@/ride/use-ride-runtime", () => ({
  useRideSimulatorControls,
}))

vi.mock("@ramp/ride-core", () => ({
  useRideSessionContext: () => ({}),
  useRideThrottledSelector: () => ({
    powerWatts: 180,
    cadenceRpm: 88,
    speedMps: 9.1,
    elapsedSeconds: 315,
    distanceMeters: 2400,
    telemetrySource: "simulated",
    trainerStatus: "ready",
  }),
}))

function createController(
  patch: Partial<RideRuntimeController> = {}
): RideRuntimeController {
  return {
    ready: true,
    session: {} as RideRuntimeController["session"],
    connection: {
      status: "connected",
      reconnect: vi.fn(() => Promise.resolve({ ok: true as const })),
      disconnect: vi.fn(() => Promise.resolve()),
      error: null,
    },
    trainer: null,
    source: "none",
    bleAvailable: true,
    selectingTrainer: false,
    connecting: false,
    connectionError: null,
    connectTrainer: vi.fn(() => Promise.resolve({ ok: true as const })),
    useSimulatorTrainer: vi.fn(() => Promise.resolve({ ok: true as const })),
    disconnectTrainer: vi.fn(() => Promise.resolve()),
    ...patch,
  }
}

function createSimulatorControls(
  patch: Partial<RideSimulatorControls> = {}
): RideSimulatorControls {
  return {
    active: false,
    riderState: null,
    trainerState: null,
    setRiderPowerMode: vi.fn(),
    setRiderPaused: vi.fn(),
    setManualPower: vi.fn(),
    setCadence: vi.fn(),
    setTrainerMode: vi.fn(() => Promise.resolve()),
    setTargetPower: vi.fn(() => Promise.resolve()),
    setResistance: vi.fn(() => Promise.resolve()),
    setSimulationGrade: vi.fn(() => Promise.resolve()),
    ...patch,
  }
}

function activeSimulatorControls(
  patch: Partial<RideSimulatorControls> = {}
): RideSimulatorControls {
  return createSimulatorControls({
    active: true,
    riderState: {
      powerWatts: 180,
      cadenceRpm: 85,
      heartRateBpm: null,
      paused: false,
      powerMode: "erg-auto",
    },
    trainerState: {
      mode: "erg",
      targetPowerWatts: 200,
      resistanceLevel: null,
      gradePercent: 0,
      windSpeedMps: 0,
      connected: true,
      currentPowerWatts: 180,
      currentCadenceRpm: 85,
      currentSpeedMps: 9,
    },
    ...patch,
  })
}

describe("RideCockpit", () => {
  it("renders simulator controls only when the simulator source is active", () => {
    useRideSimulatorControls.mockReturnValue(activeSimulatorControls())

    const { rerender } = render(
      <RideCockpit trainerController={createController({ source: "ble" })} />
    )
    expect(screen.queryByLabelText("Rider power mode")).toBeNull()

    rerender(
      <RideCockpit
        trainerController={createController({ source: "simulated" })}
      />
    )
    expect(screen.getByLabelText("Rider power mode")).toBeTruthy()
    expect(screen.getByLabelText("Trainer mode")).toBeTruthy()
  })

  it("drives simulator actions through the simulator controls hook", async () => {
    const controls = activeSimulatorControls()
    useRideSimulatorControls.mockReturnValue(controls)

    render(
      <RideCockpit
        trainerController={createController({ source: "simulated" })}
      />
    )

    fireEvent.click(screen.getByLabelText("Rider power mode"))
    fireEvent.click(screen.getByText("Manual"))
    fireEvent.click(screen.getByLabelText("Pause ride"))
    fireEvent.click(screen.getByLabelText("Trainer mode"))
    fireEvent.click(screen.getByText("Simulation"))

    await waitFor(() => {
      expect(controls.setRiderPowerMode).toHaveBeenCalledWith("manual")
      expect(controls.setRiderPaused).toHaveBeenCalledWith(true)
      expect(controls.setTrainerMode).toHaveBeenCalledWith("simulation")
    })
  })
})
