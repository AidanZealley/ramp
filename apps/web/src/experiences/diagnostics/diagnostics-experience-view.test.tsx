import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Capability } from "@ramp/ride-core"
import { DiagnosticsExperienceView } from "./diagnostics-experience-view"
import {
  displayWeightToKg,
  formatDistanceMeters,
  formatElevationMeters,
  formatSpeedKph,
  formatSpeedMps,
  formatWeightKg,
  kgToDisplayWeight,
} from "@/lib/units"

vi.mock("@/hooks/use-unit-formatters", () => ({
  useUnitFormatters: () => ({
    unitSystem: "metric",
    preferencesReady: true,
    distance: (
      meters: number,
      options?: { precision?: number; compactUnderKm?: boolean }
    ) => formatDistanceMeters(meters, "metric", options),
    elevation: (meters: number | null | undefined) =>
      formatElevationMeters(meters, "metric"),
    speedKph: (kph: number | null | undefined) => formatSpeedKph(kph, "metric"),
    speedMps: (mps: number | null | undefined) => formatSpeedMps(mps, "metric"),
    weight: (kg: number) => formatWeightKg(kg, "metric"),
    weightValue: (kg: number) => kgToDisplayWeight(kg, "metric"),
    weightInputToKg: (value: number) => displayWeightToKg(value, "metric"),
  }),
}))

type SessionOptions = {
  trainerConnected?: boolean
  capabilities?: ReadonlySet<Capability>
  dispatchImpl?: ReturnType<typeof vi.fn>
  telemetry?: Partial<{
    elapsedSeconds: number
    distanceMeters: number
    speedMps: number | null
    powerWatts: number | null
    cadenceRpm: number | null
    heartRateBpm: number | null
    trainerStatus: "disconnected" | "connecting" | "ready" | "error"
    telemetryStatus: "missing" | "fresh" | "stale"
    telemetryAgeMs: number | null
    telemetrySource: "simulated" | "ftms-ble" | "wahoo-kickr-ble" | "ant" | null
  }>
  activeControlMode?: "manual" | "experience"
  paused?: boolean
  lastError?: string | null
}

function createSession(options?: SessionOptions) {
  const dispatch =
    options?.dispatchImpl ?? vi.fn(() => Promise.resolve({ ok: true } as const))
  const listeners = new Set<() => void>()
  const telemetry = {
    elapsedSeconds: 75,
    distanceMeters: 1234,
    speedMps: 8,
    powerWatts: 211,
    cadenceRpm: 88,
    heartRateBpm: 142,
    trainerStatus: "ready" as const,
    telemetryStatus: "fresh" as const,
    lastTelemetryAtMs: 0,
    telemetryAgeMs: 25,
    telemetrySource: "ftms-ble" as const,
    ...options?.telemetry,
  }
  const state = {
    telemetry,
    trainerConnected: options?.trainerConnected ?? true,
    paused: options?.paused ?? false,
    activeControlMode: options?.activeControlMode ?? "manual",
    lastError: options?.lastError ?? null,
    lastTrainerError: null,
  }

  return {
    getState: () => state,
    getLatestTelemetry: () => null,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    subscribeFrame: () => () => {},
    connectTrainer: vi.fn(),
    disconnectTrainer: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    dispose: vi.fn(),
    controls: {
      dispatch,
      getCapabilities: () =>
        options?.capabilities ?? new Set(Object.values(Capability)),
    },
  } as never
}

describe("DiagnosticsExperienceView", () => {
  it("renders the diagnostics dashboard header", () => {
    render(<DiagnosticsExperienceView session={createSession()} />)

    expect(screen.getByText("Diagnostics")).toBeTruthy()
    expect(screen.getByText("Trainer telemetry")).toBeTruthy()
  })

  it("renders top-row Power, Speed, Heart rate, and Cadence values", () => {
    render(<DiagnosticsExperienceView session={createSession()} />)

    expect(screen.getByText("Rider")).toBeTruthy()
    expect(screen.getByTestId("rider-power").textContent).toContain("211W")
    expect(screen.getByText("Speed")).toBeTruthy()
    expect(screen.getByText("28.8 km/h")).toBeTruthy()
    expect(screen.getByText("Heart rate")).toBeTruthy()
    expect(screen.getByText("142 bpm")).toBeTruthy()
    expect(screen.getByText("Cadence")).toBeTruthy()
    expect(screen.getByText("88 rpm")).toBeTruthy()
  })

  it("displays null telemetry fallbacks", () => {
    render(
      <DiagnosticsExperienceView
        session={createSession({
          telemetry: {
            powerWatts: null,
            speedMps: null,
            heartRateBpm: null,
            cadenceRpm: null,
          },
        })}
      />
    )

    expect(screen.getByTestId("rider-power").textContent).toContain("--W")
    expect(screen.getByText("-- km/h")).toBeTruthy()
    expect(screen.getByText("Not connected")).toBeTruthy()
    expect(screen.getByText("-- rpm")).toBeTruthy()
  })

  it("shows status fields", () => {
    render(
      <DiagnosticsExperienceView
        session={createSession({
          telemetry: {
            trainerStatus: "ready",
            telemetryStatus: "stale",
            telemetrySource: "simulated",
          },
          activeControlMode: "experience",
          paused: true,
        })}
      />
    )

    const status = screen.getByLabelText("Status")
    expect(within(status).getByText("Trainer status")).toBeTruthy()
    expect(within(status).getByText("ready")).toBeTruthy()
    expect(within(status).getByText("Telemetry status")).toBeTruthy()
    expect(within(status).getByText("stale")).toBeTruthy()
    expect(within(status).getByText("Source")).toBeTruthy()
    expect(within(status).getByText("simulated")).toBeTruthy()
    expect(within(status).getByText("Connected")).toBeTruthy()
    expect(within(status).getAllByText("yes")).toHaveLength(2)
    expect(within(status).getByText("Control mode")).toBeTruthy()
    expect(within(status).getByText("experience")).toBeTruthy()
    expect(within(status).getByText("Paused")).toBeTruthy()
  })

  it("shows sorted capabilities or None reported", () => {
    const { rerender } = render(
      <DiagnosticsExperienceView
        session={createSession({
          capabilities: new Set([Capability.TargetPower, Capability.ReadPower]),
        })}
      />
    )

    const capabilities = within(screen.getByLabelText("Capabilities"))
      .getAllByText(/power/i)
      .map((node) => node.textContent)
    expect(capabilities).toEqual(["read.power", "write.targetPower"])

    rerender(
      <DiagnosticsExperienceView
        session={createSession({ capabilities: new Set() })}
      />
    )
    expect(screen.getByText("None reported")).toBeTruthy()
  })

  it("dispatches mode changes and renders successful dispatch results", async () => {
    const dispatch = vi.fn(() => Promise.resolve({ ok: true } as const))
    render(
      <DiagnosticsExperienceView
        session={createSession({ dispatchImpl: dispatch })}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "ERG" }))

    expect(dispatch).toHaveBeenCalledWith(
      { type: "setMode", mode: "erg" },
      "user"
    )
    await waitFor(() => {
      expect(screen.getByText("ok")).toBeTruthy()
    })
  })

  it("disables the ERG slider when TargetPower capability is unavailable", () => {
    render(
      <DiagnosticsExperienceView
        session={createSession({
          capabilities: new Set([Capability.ReadPower]),
        })}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "ERG" }))

    expect(screen.getByLabelText("Target power").hasAttribute("data-disabled"))
      .toBe(true)
    expect(screen.getByText("Capability not available")).toBeTruthy()
  })

  it("renders rejected dispatch reasons", async () => {
    const dispatch = vi.fn(() =>
      Promise.resolve({ ok: false, reason: "capability-unsupported" } as const)
    )
    render(
      <DiagnosticsExperienceView
        session={createSession({ dispatchImpl: dispatch })}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Resistance" }))

    await waitFor(() => {
      expect(
        screen.getByText("rejected: capability-unsupported")
      ).toBeTruthy()
    })
  })
})
