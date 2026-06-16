import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RideSessionPage } from "./ride-session-page"
import type { Capability } from "@ramp/trainer-io"
import type { RideExperienceDefinition } from "@/experiences/types"
import type { RideRuntimeController } from "@/ride/use-ride-runtime"
import type * as ReactModule from "react"
import { formatDistanceMeters, formatSpeedMps } from "@/lib/units"

vi.mock("@/hooks/use-unit-formatters", () => ({
  useUnitFormatters: () => ({
    unitSystem: "metric",
    preferencesReady: true,
    speedMps: (mps: number | null | undefined) => formatSpeedMps(mps, "metric"),
    distance: (
      meters: number,
      options?: { precision?: number; compactUnderKm?: boolean }
    ) => formatDistanceMeters(meters, "metric", options),
  }),
}))

vi.mock("@/hooks/activity/use-activity-session", () => ({
  useActivitySession: () => ({
    busy: false,
    unresolvedActivity: null,
    resumeActivity: null,
    complete: vi.fn(),
    discard: vi.fn(),
    markPending: vi.fn(),
    saveProgress: vi.fn(),
  }),
}))

vi.mock("./ride-connection-control", () => ({
  RideConnectionDialog: ({
    open,
    onOpenChange,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
  }) =>
    open ? (
      <div role="dialog" aria-label="Connect trainer">
        <p>Connection dialog</p>
        <button type="button" onClick={() => onOpenChange(false)}>
          Close dialog
        </button>
      </div>
    ) : null,
}))

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

vi.mock("@/ride/ride-runtime-context", async () => {
  const React = await vi.importActual<typeof ReactModule>("react")
  return {
    useRideRuntimeContext: () => {
      const [activeTrainer, setActiveTrainer] = React.useState<
        typeof trainer | null
      >(null)
      const [source, setSource] = React.useState<"none" | "simulated" | "ble">(
        "none"
      )
      const session = {
        getState: vi.fn(),
        subscribe: vi.fn(() => () => undefined),
        subscribeFrame: vi.fn(() => () => undefined),
        pause: vi.fn(),
        resume: vi.fn(),
        controls: {
          dispatch: vi.fn(() => Promise.resolve({ ok: true as const })),
          getCapabilities: vi.fn(() => new Set()),
        },
      } as unknown as RideRuntimeController["session"]
      const trainerDetails =
        activeTrainer && source !== "none"
          ? {
              source,
              name: source === "ble" ? "Trainer One" : "Simulated Trainer",
            }
          : null
      return {
        ready: true,
        session,
        connection: {
          status: activeTrainer ? "connected" : "disconnected",
          reconnect: vi.fn(() => Promise.resolve({ ok: true as const })),
          disconnect: vi.fn(() => Promise.resolve()),
          error: null,
        },
        connectionView: {
          phase: activeTrainer ? "connected" : "idle",
          source,
          trainerName: trainerDetails?.name ?? null,
          error: null,
          bleAvailable: true,
          canConnectBle: true,
          canUseSimulator: !activeTrainer,
          canCancel: false,
        },
        trainer: activeTrainer,
        trainerDetails,
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
        cancelConnection: vi.fn(() => Promise.resolve()),
      } satisfies RideRuntimeController
    },
  }
})

vi.mock("./ride-overlay", () => ({
  RideOverlay: ({
    trainerController,
  }: {
    trainerController: RideRuntimeController
  }) => (
    <button
      type="button"
      onClick={() => {
        void trainerController.disconnectTrainer()
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

  it("mounts the experience while disconnected and opens the connection dialog", async () => {
    render(<RideSessionPage experience={experience} />)

    await waitFor(() => {
      expect(screen.getByText("Experience mounted")).toBeTruthy()
    })
    expect(screen.getByRole("dialog", { name: "Connect trainer" })).toBeTruthy()
  })

  it("does not reopen the connection dialog after it is closed", async () => {
    render(<RideSessionPage experience={experience} />)

    await screen.findByText("Experience mounted")
    fireEvent.click(screen.getByText("Close dialog"))
    expect(screen.queryByRole("dialog", { name: "Connect trainer" })).toBeNull()
  })

  it("keeps the experience mounted after overlay disconnect", async () => {
    render(<RideSessionPage experience={experience} />)

    await screen.findByText("Experience mounted")
    fireEvent.click(screen.getByText("Disconnect test trainer"))

    await waitFor(() => {
      expect(screen.getByText("Experience mounted")).toBeTruthy()
    })
  })

  it("passes search workoutId to the experience view", async () => {
    render(
      <RideSessionPage
        experience={experience}
        search={{ workoutId: "workout-1" as never }}
      />
    )

    await waitFor(() => {
      expect(experienceViewProps).toHaveBeenCalledWith(
        expect.objectContaining({
          search: { workoutId: "workout-1" },
        })
      )
    })
  })
})
