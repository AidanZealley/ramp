import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Capability } from "@ramp/trainer-io"
import { describe, expect, it, vi } from "vitest"
import { RideSessionPage } from "./ride-session-page"
import type { RideExperienceDefinition } from "@/experiences/types"
import type { RideTrainerController } from "@/ride/use-ride-trainer"

const { trainer } = vi.hoisted(() => ({
  trainer: {
    kind: "simulated" as const,
    capabilities: new Set<Capability>(),
    state: { kind: "disconnected" as const },
    connect: vi.fn(() => Promise.resolve(undefined)),
    disconnect: vi.fn(() => Promise.resolve(undefined)),
    sendCommand: vi.fn(() => Promise.resolve(undefined)),
    subscribeTelemetry: vi.fn(() => () => undefined),
    subscribeState: vi.fn(() => () => undefined),
    subscribeError: vi.fn(() => () => undefined),
  },
}))

vi.mock("@/ride/use-ride-trainer", async () => {
  const React = await vi.importActual<typeof import("react")>("react")
  return {
    useRideTrainer: () => {
      const [activeTrainer, setActiveTrainer] = React.useState<
        typeof trainer | null
      >(null)
      const [source, setSource] = React.useState<"none" | "simulated" | "ble">(
        "none"
      )
      return {
        trainer: activeTrainer,
        source,
        selectedSource: "simulated",
        devSimulationEnabled: true,
        bleAvailable: true,
        selectingBleTrainer: false,
        connecting: false,
        connectionError: null,
        simulatedTrainer: null,
        simulatedRider: null,
        selectSource: vi.fn(),
        connectSelectedTrainer: vi.fn(async () => {
          setActiveTrainer(trainer)
          setSource("simulated")
          return true
        }),
        connectBleTrainer: vi.fn(() => Promise.resolve(false)),
        useSimulatedTrainer: vi.fn(() => Promise.resolve(false)),
        disconnectTrainer: vi.fn(async () => {
          await activeTrainer?.disconnect()
          setActiveTrainer(null)
          setSource("none")
        }),
      } satisfies RideTrainerController
    },
  }
})

vi.mock("./ride-overlay", () => ({
  RideOverlay: ({
    onDisconnected,
    trainerController,
  }: {
    onDisconnected?: () => void
    trainerController: RideTrainerController
  }) => (
    <button
      type="button"
      onClick={() => {
        void trainerController.disconnectTrainer().then(() => {
          onDisconnected?.()
        })
      }}
    >
      Disconnect test trainer
    </button>
  ),
}))

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
  loadPlugin: vi.fn(async () => ({
    id: "test",
    displayName: "Test Ride",
    ExperienceView: () => <div>Experience mounted</div>,
  })),
}

describe("RideSessionPage", () => {
  it("does not mount the experience before trainer connection", () => {
    render(<RideSessionPage experience={experience} />)

    expect(screen.getByText("Start with simulator")).toBeTruthy()
    expect(screen.queryByText("Experience mounted")).toBeNull()
  })

  it("mounts the experience after gate connection succeeds", async () => {
    render(<RideSessionPage experience={experience} />)

    fireEvent.click(screen.getByText("Start with simulator"))

    await waitFor(() => {
      expect(screen.getByText("Experience mounted")).toBeTruthy()
    })
  })

  it("returns to the connection gate after overlay disconnect", async () => {
    render(<RideSessionPage experience={experience} />)

    fireEvent.click(screen.getByText("Start with simulator"))

    await screen.findByText("Experience mounted")
    fireEvent.click(screen.getByText("Disconnect test trainer"))

    await waitFor(() => {
      expect(screen.getByText("Start with simulator")).toBeTruthy()
      expect(screen.queryByText("Experience mounted")).toBeNull()
    })
  })
})
