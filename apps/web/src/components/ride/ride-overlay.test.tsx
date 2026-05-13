import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RideOverlay } from "./ride-overlay"
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

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
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

function createController(
  patch: Partial<RideRuntimeController> = {}
): RideRuntimeController {
  return {
    ready: true,
    session: {} as RideRuntimeController["session"],
    connection: {
      status: "disconnected",
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

describe("RideOverlay", () => {
  it("shows simulator selection before BLE is connected", () => {
    useRideSimulatorControls.mockReturnValue(createSimulatorControls())

    render(<RideOverlay trainerController={createController()} />)

    expect(screen.getByText("No trainer")).toBeTruthy()
    expect(screen.getByText("Use simulator")).toBeTruthy()
    expect(screen.getByText("Connect trainer")).toBeTruthy()
  })

  it("calls connectTrainer from the physical trainer action", async () => {
    useRideSimulatorControls.mockReturnValue(createSimulatorControls())
    const connectTrainer = vi.fn(() => Promise.resolve({ ok: true as const }))
    render(
      <RideOverlay trainerController={createController({ connectTrainer })} />
    )

    fireEvent.click(screen.getByText("Connect trainer"))

    await waitFor(() => {
      expect(connectTrainer).toHaveBeenCalledTimes(1)
    })
  })

  it("calls useSimulatorTrainer from the dev simulator action", async () => {
    useRideSimulatorControls.mockReturnValue(createSimulatorControls())
    const useSimulatorTrainer = vi.fn(() =>
      Promise.resolve({ ok: true as const })
    )
    render(
      <RideOverlay
        trainerController={createController({ useSimulatorTrainer })}
      />
    )

    fireEvent.click(screen.getByText("Use simulator"))

    await waitFor(() => {
      expect(useSimulatorTrainer).toHaveBeenCalledTimes(1)
    })
  })

  it("toggles the cockpit from the settings button", () => {
    useRideSimulatorControls.mockReturnValue(createSimulatorControls())
    render(<RideOverlay trainerController={createController()} />)

    fireEvent.click(screen.getByLabelText("Show ride cockpit"))
    expect(screen.getByLabelText("Hide ride cockpit")).toBeTruthy()
    expect(screen.getByText("Power")).toBeTruthy()
  })

  it("displays source status for simulator, BLE, and none", () => {
    useRideSimulatorControls.mockReturnValue(createSimulatorControls())
    const { rerender } = render(
      <RideOverlay trainerController={createController({ source: "none" })} />
    )
    expect(screen.getByText("No trainer")).toBeTruthy()

    rerender(
      <RideOverlay
        trainerController={createController({ source: "simulated" })}
      />
    )
    expect(screen.getByText("Simulator")).toBeTruthy()

    rerender(
      <RideOverlay trainerController={createController({ source: "ble" })} />
    )
    expect(screen.getByText("Bluetooth trainer")).toBeTruthy()
  })

  it("calls onDisconnected after disconnecting from the overlay", async () => {
    useRideSimulatorControls.mockReturnValue(createSimulatorControls())
    const onDisconnected = vi.fn()
    const disconnectTrainer = vi.fn(() => Promise.resolve())
    render(
      <RideOverlay
        onDisconnected={onDisconnected}
        trainerController={createController({
          source: "simulated",
          disconnectTrainer,
        })}
      />
    )

    fireEvent.click(screen.getByText("Disconnect"))

    await waitFor(() => {
      expect(disconnectTrainer).toHaveBeenCalledTimes(1)
      expect(onDisconnected).toHaveBeenCalledTimes(1)
    })
  })

  it("renders simulator controls only from the simulator controls hook", () => {
    useRideSimulatorControls.mockReturnValue(
      createSimulatorControls({
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
      })
    )
    render(
      <RideOverlay
        trainerController={createController({ source: "simulated" })}
      />
    )

    fireEvent.click(screen.getByLabelText("Show ride cockpit"))

    expect(screen.getByLabelText("Rider power mode")).toBeTruthy()
    expect(screen.getByLabelText("Trainer mode")).toBeTruthy()
  })

  it("wires simulator controls through the simulator controls hook", async () => {
    const controls = createSimulatorControls({
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
    })
    useRideSimulatorControls.mockReturnValue(controls)
    render(
      <RideOverlay
        trainerController={createController({ source: "simulated" })}
      />
    )

    fireEvent.click(screen.getByLabelText("Show ride cockpit"))
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
