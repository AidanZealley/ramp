import { describe, expect, it, vi } from "vitest"
import { getConnectionState } from "./utils"
import type { RideRuntimeController } from "@/ride/use-ride-runtime"

function createRuntime(
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
    trainerDetails: null,
    source: "none",
    bleAvailable: true,
    selectingTrainer: false,
    connecting: false,
    connectionError: null,
    connectTrainer: vi.fn(() => Promise.resolve({ ok: true as const })),
    useSimulatorTrainer: vi.fn(() => Promise.resolve({ ok: true as const })),
    disconnectTrainer: vi.fn(() => Promise.resolve()),
    cancelConnection: vi.fn(() => Promise.resolve()),
    ...patch,
  }
}

describe("getConnectionState", () => {
  it("returns idle when nothing is happening", () => {
    expect(getConnectionState(createRuntime())).toEqual({ status: "idle" })
  })

  it("returns connected with trainer name", () => {
    expect(
      getConnectionState(
        createRuntime({
          source: "ble",
          trainerDetails: { source: "ble", name: "KICKR CORE" },
        })
      )
    ).toEqual({ status: "connected", trainerName: "KICKR CORE" })
  })

  it("returns connecting when connecting", () => {
    expect(
      getConnectionState(
        createRuntime({
          connecting: true,
          trainerDetails: { source: "ble", name: "KICKR CORE" },
        })
      )
    ).toEqual({ status: "connecting", trainerName: "KICKR CORE" })
  })

  it("returns selecting when selecting trainer", () => {
    expect(
      getConnectionState(
        createRuntime({
          selectingTrainer: true,
        })
      )
    ).toEqual({ status: "selecting" })
  })

  it("returns connecting when switching trainers while already connected", () => {
    expect(
      getConnectionState(
        createRuntime({
          source: "simulated",
          connecting: true,
          trainerDetails: { source: "ble", name: "KICKR CORE" },
        })
      )
    ).toEqual({ status: "connecting", trainerName: "KICKR CORE" })
  })

  it("returns selecting when picking a new device while already connected", () => {
    expect(
      getConnectionState(
        createRuntime({
          source: "simulated",
          selectingTrainer: true,
          trainerDetails: { source: "simulated", name: "Simulated Trainer" },
        })
      )
    ).toEqual({ status: "selecting" })
  })

  it("returns failed with error message", () => {
    expect(
      getConnectionState(
        createRuntime({
          connectionError: "Bluetooth transport failed.",
        })
      )
    ).toEqual({ status: "failed", message: "Bluetooth transport failed." })
  })
})
