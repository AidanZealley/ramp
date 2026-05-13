import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RideSessionPage } from "./ride-session-page"
import type { Capability } from "@ramp/trainer-io"
import type { RideExperienceDefinition } from "@/experiences/types"
import type { RideRuntimeController } from "@/ride/use-ride-runtime"
import type * as ReactModule from "react"

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

const experienceViewProps = vi.hoisted(() => vi.fn())

vi.mock("@/ride/use-ride-runtime", async () => {
  const React = await vi.importActual<typeof ReactModule>("react")
  return {
    useRideRuntime: () => {
      const [activeTrainer, setActiveTrainer] = React.useState<
        typeof trainer | null
      >(null)
      const [source, setSource] = React.useState<"none" | "simulated" | "ble">(
        "none"
      )
      const session = {
        getState: vi.fn(),
        subscribe: vi.fn(() => () => undefined),
      } as unknown as RideRuntimeController["session"]
      return {
        ready: true,
        session,
        connection: {
          status: activeTrainer ? "connected" : "disconnected",
          reconnect: vi.fn(() => Promise.resolve({ ok: true as const })),
          disconnect: vi.fn(() => Promise.resolve()),
          error: null,
        },
        trainer: activeTrainer,
        source,
        bleAvailable: true,
        selectingTrainer: false,
        connecting: false,
        connectionError: null,
        connectTrainer: vi.fn(() => {
          setActiveTrainer(trainer)
          setSource("ble")
          return Promise.resolve({ ok: true as const })
        }),
        useSimulatorTrainer: vi.fn(() => {
          setActiveTrainer(trainer)
          setSource("simulated")
          return Promise.resolve({ ok: true as const })
        }),
        disconnectTrainer: vi.fn(async () => {
          await activeTrainer?.disconnect()
          setActiveTrainer(null)
          setSource("none")
        }),
      } satisfies RideRuntimeController
    },
  }
})

vi.mock("./ride-overlay", () => ({
  RideOverlay: ({
    onDisconnected,
    trainerController,
  }: {
    onDisconnected?: () => void
    trainerController: RideRuntimeController
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
  loadPlugin: vi.fn(() =>
    Promise.resolve({
      id: "test",
      displayName: "Test Ride",
      ExperienceView: (props: Record<string, unknown>) => {
        experienceViewProps(props)
        return <div>Experience mounted</div>
      },
    })
  ),
}

describe("RideSessionPage", () => {
  beforeEach(() => {
    experienceViewProps.mockClear()
  })

  it("does not mount the experience before trainer connection", () => {
    render(<RideSessionPage experience={experience} />)

    expect(screen.getByText("Use simulator")).toBeTruthy()
    expect(screen.queryByText("Experience mounted")).toBeNull()
  })

  it("mounts the experience after gate connection succeeds", async () => {
    render(<RideSessionPage experience={experience} />)

    fireEvent.click(screen.getByText("Use simulator"))

    await waitFor(() => {
      expect(screen.getByText("Experience mounted")).toBeTruthy()
    })
  })

  it("returns to the connection gate after overlay disconnect", async () => {
    render(<RideSessionPage experience={experience} />)

    fireEvent.click(screen.getByText("Use simulator"))

    await screen.findByText("Experience mounted")
    fireEvent.click(screen.getByText("Disconnect test trainer"))

    await waitFor(() => {
      expect(screen.getByText("Use simulator")).toBeTruthy()
      expect(screen.queryByText("Experience mounted")).toBeNull()
    })
  })

  it("passes search workoutId to the experience view", async () => {
    render(
      <RideSessionPage
        experience={experience}
        search={{ workoutId: "workout-1" as never }}
      />
    )

    fireEvent.click(screen.getByText("Use simulator"))

    await waitFor(() => {
      expect(experienceViewProps).toHaveBeenCalledWith(
        expect.objectContaining({
          search: { workoutId: "workout-1" },
        })
      )
    })
  })
})
