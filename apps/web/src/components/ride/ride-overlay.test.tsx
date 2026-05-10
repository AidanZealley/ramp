import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SimulatedTrainer } from "@ramp/trainer-io"
import { RideOverlay } from "./ride-overlay"
import type { RideTrainerController } from "@/ride/use-ride-trainer"

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock("./ride-hud", () => ({
  RideHud: () => <div>Ride HUD</div>,
}))

function createController(
  patch: Partial<RideTrainerController> = {}
): RideTrainerController {
  const simulatedTrainer = new SimulatedTrainer()
  return {
    trainer: null,
    source: "none",
    devSimulationEnabled: true,
    bleAvailable: true,
    selectingBleTrainer: false,
    simulatedTrainer,
    simulatedRider: simulatedTrainer.rider,
    connectBleTrainer: vi.fn(() => Promise.resolve(true)),
    useSimulatedTrainer: vi.fn(() => Promise.resolve()),
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
    fireEvent.click(screen.getByLabelText("Show ride overlay panels"))
    expect(screen.queryByText("Manual inputs")).toBeNull()
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

    fireEvent.click(screen.getByLabelText("Show ride overlay panels"))
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

    fireEvent.click(screen.getByLabelText("Show ride overlay panels"))
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
