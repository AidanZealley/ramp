import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { SimulatedTrainer } from "@ramp/trainer-io"
import { RideConnectionGate } from "./RideConnectionGate"
import type { RideExperienceDefinition } from "@/experiences/types"
import type { RideTrainerController } from "@/ride/use-ride-trainer"

const experience: RideExperienceDefinition = {
  id: "test",
  displayName: "Test Ride",
  description: "A focused test ride.",
  tags: [],
  accent: {
    from: "#ffffff",
    to: "#f1f5f9",
    ink: "#111827",
  },
  preview: {
    eyebrow: "Test",
    spotlight: "Ride",
  },
  loadPlugin: vi.fn(),
}

function createController(
  patch: Partial<RideTrainerController> = {}
): RideTrainerController {
  const simulatedTrainer = new SimulatedTrainer()
  return {
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

describe("RideConnectionGate", () => {
  it("renders simulator and BLE choices with simulator selected in dev mode", () => {
    render(
      <RideConnectionGate
        experience={experience}
        trainerController={createController()}
        onConnected={vi.fn()}
      />
    )

    expect(screen.getByText("Test Ride")).toBeTruthy()
    expect(screen.getByText("A focused test ride.")).toBeTruthy()
    expect(screen.getByText("Start with simulator")).toBeTruthy()
    expect(screen.getByLabelText("Bluetooth trainer")).toBeTruthy()
  })

  it("connects and calls onConnected from the simulator primary action", async () => {
    const onConnected = vi.fn()
    const connectSelectedTrainer = vi.fn(() => Promise.resolve(true))

    render(
      <RideConnectionGate
        experience={experience}
        trainerController={createController({ connectSelectedTrainer })}
        onConnected={onConnected}
      />
    )

    fireEvent.click(screen.getByText("Start with simulator"))

    await waitFor(() => {
      expect(connectSelectedTrainer).toHaveBeenCalledTimes(1)
      expect(onConnected).toHaveBeenCalledTimes(1)
    })
  })

  it("disables the BLE path and shows the Web Bluetooth message", () => {
    render(
      <RideConnectionGate
        experience={experience}
        trainerController={createController({
          bleAvailable: false,
          selectedSource: "ble",
        })}
        onConnected={vi.fn()}
      />
    )

    expect(screen.getAllByText(
      "Web Bluetooth requires a Chromium-class browser."
    ).length).toBeGreaterThan(0)
    expect(
      (screen.getByText("Connect trainer") as HTMLButtonElement).disabled
    ).toBe(true)
    expect(
      (screen.getByLabelText("Bluetooth trainer") as HTMLButtonElement).disabled
    ).toBe(true)
  })

  it("shows connection errors and does not call onConnected on failure", async () => {
    const onConnected = vi.fn()

    function FailedGate() {
      const [connectionError, setConnectionError] = useState<string | null>(
        null
      )
      return (
        <RideConnectionGate
          experience={experience}
          trainerController={createController({
            connectionError,
            connectSelectedTrainer: vi.fn(async () => {
              setConnectionError("Could not connect to trainer.")
              return false
            }),
          })}
          onConnected={onConnected}
        />
      )
    }

    render(<FailedGate />)

    fireEvent.click(screen.getByText("Start with simulator"))

    await waitFor(() => {
      expect(screen.getByText("Could not connect to trainer.")).toBeTruthy()
      expect(onConnected).not.toHaveBeenCalled()
    })
  })

  it("links back to rides", () => {
    render(
      <RideConnectionGate
        experience={experience}
        trainerController={createController()}
        onConnected={vi.fn()}
      />
    )

    expect(screen.getAllByText("Back to rides")[0].closest("a")?.href).toBe(
      "http://localhost:3000/ride"
    )
  })
})
