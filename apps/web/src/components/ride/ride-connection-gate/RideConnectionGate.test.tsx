import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { RideConnectionGate } from "./RideConnectionGate"
import type { RideExperienceDefinition } from "@/experiences/types"
import type { RideRuntimeController } from "@/ride/use-ride-runtime"

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

describe("RideConnectionGate", () => {
  it("renders disabled setup shell while runtime is preparing", () => {
    render(
      <RideConnectionGate
        experience={experience}
        trainerController={null}
        onConnected={vi.fn()}
      />
    )

    expect(screen.getByText("Test Ride")).toBeTruthy()
    expect(screen.getByText("Preparing ride").hasAttribute("disabled")).toBe(
      true
    )
  })

  it("renders the experience summary and Connect trainer action", () => {
    render(
      <RideConnectionGate
        experience={experience}
        trainerController={createController()}
        onConnected={vi.fn()}
      />
    )

    expect(screen.getByText("Test Ride")).toBeTruthy()
    expect(screen.getByText("A focused test ride.")).toBeTruthy()
    expect(screen.getByText("Connect trainer")).toBeTruthy()
  })

  it("disables Connect trainer and shows unsupported copy when BLE is unavailable", () => {
    render(
      <RideConnectionGate
        experience={experience}
        trainerController={createController({ bleAvailable: false })}
        onConnected={vi.fn()}
      />
    )

    expect(
      screen.getByText("Web Bluetooth requires a Chromium-class browser.")
    ).toBeTruthy()
    expect(screen.getByText("Connect trainer").hasAttribute("disabled")).toBe(
      true
    )
  })

  it("renders the dev simulator action", () => {
    render(
      <RideConnectionGate
        experience={experience}
        trainerController={createController()}
        onConnected={vi.fn()}
      />
    )

    expect(screen.getByText("Use simulator")).toBeTruthy()
  })

  it("selects the simulator and calls onConnected after success", async () => {
    const onConnected = vi.fn()
    const useSimulatorTrainer = vi.fn(() =>
      Promise.resolve({ ok: true as const })
    )

    render(
      <RideConnectionGate
        experience={experience}
        trainerController={createController({ useSimulatorTrainer })}
        onConnected={onConnected}
      />
    )

    fireEvent.click(screen.getByText("Use simulator"))

    await waitFor(() => {
      expect(useSimulatorTrainer).toHaveBeenCalledTimes(1)
      expect(onConnected).toHaveBeenCalledTimes(1)
    })
  })

  it("does not render a trainer source toggle group", () => {
    render(
      <RideConnectionGate
        experience={experience}
        trainerController={createController()}
        onConnected={vi.fn()}
      />
    )

    expect(screen.queryByLabelText("Trainer source")).toBeNull()
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
            connectTrainer: vi.fn(() => {
              setConnectionError("Could not connect to trainer.")
              return Promise.resolve({
                ok: false,
                error: { code: "transport", message: "Could not connect." },
              } as const)
            }),
          })}
          onConnected={onConnected}
        />
      )
    }

    render(<FailedGate />)

    fireEvent.click(screen.getByText("Connect trainer"))

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
