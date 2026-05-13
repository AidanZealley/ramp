import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SimulatedTrainer } from "@ramp/trainer-io"
import { RideOverlay } from "./ride-overlay"
import type { RideRuntime } from "@/ride/use-ride-runtime"

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock("@ramp/ride-core", () => ({
  useRideSessionContext: () => ({}),
  useRideSelector: (
    _session: unknown,
    selector: (state: {
      telemetry: {
        powerWatts: number
        cadenceRpm: number
        speedMps: number
        elapsedSeconds: number
        distanceMeters: number
        telemetrySource: string
        trainerStatus: string
      }
    }) => unknown
  ) =>
    selector({
      telemetry: {
        powerWatts: 180,
        cadenceRpm: 88,
        speedMps: 9.1,
        elapsedSeconds: 315,
        distanceMeters: 2400,
        telemetrySource: "simulated",
        trainerStatus: "ready",
      },
    }),
  useRideSession: () => ({
    telemetry: {
      powerWatts: 180,
      cadenceRpm: 88,
      speedMps: 9.1,
      elapsedSeconds: 315,
      distanceMeters: 2400,
      telemetrySource: "simulated",
      trainerStatus: "ready",
    },
  }),
}))

function createController(patch: Partial<RideRuntime> = {}): RideRuntime {
  const simulatedTrainer = new SimulatedTrainer()
  return {
    session: {} as RideRuntime["session"],
    connection: {
      status: "disconnected",
      reconnect: vi.fn(() => Promise.resolve({ ok: true as const })),
      disconnect: vi.fn(() => Promise.resolve()),
      error: null,
    },
    trainer: null,
    source: "none",
    selectedSource: "simulated",
    devSimulationEnabled: true,
    bleAvailable: true,
    selectingBleTrainer: false,
    connecting: false,
    connectionError: null,
    simulatedTrainer,
    simulatedRider: simulatedTrainer.rider,
    selectSource: vi.fn(),
    connectSelectedTrainer: vi.fn(() => Promise.resolve(true)),
    connectBleTrainer: vi.fn(() => Promise.resolve(true)),
    useSimulatedTrainer: vi.fn(() => Promise.resolve(true)),
    disconnectTrainer: vi.fn(() => Promise.resolve()),
    ...patch,
  }
}

describe("RideOverlay", () => {
  it("shows simulator selection before BLE is connected", () => {
    render(<RideOverlay trainerController={createController()} />)

    expect(screen.getByText("No trainer")).toBeTruthy()
    expect(screen.getByText("Use simulator")).toBeTruthy()
    expect(screen.getByText("Connect trainer")).toBeTruthy()
  })

  it("hides simulator controls when the dev flag is disabled", () => {
    const simulatedTrainer = new SimulatedTrainer()
    render(
      <RideOverlay
        trainerController={createController({
          devSimulationEnabled: false,
          source: "simulated",
          trainer: simulatedTrainer,
          simulatedTrainer,
          simulatedRider: simulatedTrainer.rider,
        })}
      />
    )

    expect(screen.queryByText("Use simulator")).toBeNull()
    fireEvent.click(screen.getByLabelText("Show ride cockpit"))
    expect(screen.queryByLabelText("Rider power mode")).toBeNull()
    expect(screen.queryByLabelText("Trainer mode")).toBeNull()
  })

  it("toggles the cockpit from the settings button", () => {
    render(<RideOverlay trainerController={createController()} />)

    fireEvent.click(screen.getByLabelText("Show ride cockpit"))
    expect(screen.getByLabelText("Hide ride cockpit")).toBeTruthy()
    expect(screen.getByText("Power")).toBeTruthy()
  })

  it("displays source status for simulator, BLE, and none", () => {
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

  it("wires rider controls to simulated rider commands", async () => {
    const simulatedTrainer = new SimulatedTrainer()
    simulatedTrainer.rider.dispatch({ type: "setPowerMode", mode: "erg-auto" })
    const riderDispatch = vi.spyOn(simulatedTrainer.rider, "dispatch")
    render(
      <RideOverlay
        trainerController={createController({
          source: "simulated",
          trainer: simulatedTrainer,
          simulatedTrainer,
          simulatedRider: simulatedTrainer.rider,
        })}
      />
    )

    fireEvent.click(screen.getByLabelText("Show ride cockpit"))
    fireEvent.click(screen.getByLabelText("Rider power mode"))
    fireEvent.click(screen.getByText("Manual"))
    fireEvent.click(screen.getByLabelText("Pause ride"))

    await waitFor(() => {
      expect(riderDispatch).toHaveBeenCalledWith({
        type: "setPowerMode",
        mode: "manual",
      })
      expect(riderDispatch).toHaveBeenCalledWith({
        type: "setPaused",
        paused: true,
      })
    })
  })

  it("wires trainer mode controls to simulated trainer commands", async () => {
    const simulatedTrainer = new SimulatedTrainer()
    await simulatedTrainer.connect()
    const sendCommand = vi.spyOn(simulatedTrainer, "sendCommand")
    render(
      <RideOverlay
        trainerController={createController({
          source: "simulated",
          trainer: simulatedTrainer,
          simulatedTrainer,
          simulatedRider: simulatedTrainer.rider,
        })}
      />
    )

    fireEvent.click(screen.getByLabelText("Show ride cockpit"))
    fireEvent.click(screen.getByLabelText("Trainer mode"))
    fireEvent.click(screen.getByText("Simulation"))

    await waitFor(() => {
      expect(sendCommand).toHaveBeenCalledWith({
        type: "setMode",
        mode: "simulation",
      })
    })
    await simulatedTrainer.disconnect()
  })
})
