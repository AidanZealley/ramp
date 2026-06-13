import { describe, expect, it, vi } from "vitest"
import { getConnectionState } from "./utils"
import type { RideRuntimeController } from "@/ride/use-ride-runtime"
import {
  createConnectionView,
  createRuntimeController,
} from "@/ride/test-utils/ride-runtime-test-helpers"

function createRuntime(
  patch: Partial<RideRuntimeController> = {}
): RideRuntimeController {
  return createRuntimeController(patch)
}

describe("getConnectionState", () => {
  it("returns idle when nothing is happening", () => {
    expect(getConnectionState(createRuntime())).toEqual({ status: "idle" })
  })

  it("returns connected with trainer name", () => {
    expect(
      getConnectionState(
        createRuntime({
          connectionView: createConnectionView({
            phase: "connected",
            source: "ble",
            trainerName: "KICKR CORE",
          }),
        })
      )
    ).toEqual({ status: "connected", trainerName: "KICKR CORE" })
  })

  it("returns connecting when connecting", () => {
    expect(
      getConnectionState(
        createRuntime({
          connectionView: createConnectionView({
            phase: "connecting",
            source: "ble",
            trainerName: "KICKR CORE",
            canConnectBle: false,
            canUseSimulator: false,
            canCancel: true,
          }),
        })
      )
    ).toEqual({ status: "connecting", trainerName: "KICKR CORE" })
  })

  it("returns selecting when selecting trainer", () => {
    expect(
      getConnectionState(
        createRuntime({
          connectionView: createConnectionView({
            phase: "selecting",
            canConnectBle: false,
            canUseSimulator: false,
            canCancel: true,
          }),
        })
      )
    ).toEqual({ status: "selecting" })
  })

  it("returns connecting when switching trainers while already connected", () => {
    expect(
      getConnectionState(
        createRuntime({
          connectionView: createConnectionView({
            phase: "connecting",
            source: "simulated",
            trainerName: "KICKR CORE",
            canConnectBle: false,
            canUseSimulator: false,
            canCancel: true,
          }),
        })
      )
    ).toEqual({ status: "connecting", trainerName: "KICKR CORE" })
  })

  it("returns selecting when picking a new device while already connected", () => {
    expect(
      getConnectionState(
        createRuntime({
          connectionView: createConnectionView({
            phase: "selecting",
            source: "simulated",
            trainerName: "Simulated Trainer",
            canConnectBle: false,
            canUseSimulator: false,
            canCancel: true,
          }),
        })
      )
    ).toEqual({ status: "selecting" })
  })

  it("returns failed with error message", () => {
    expect(
      getConnectionState(
        createRuntime({
          connectionView: createConnectionView({
            phase: "failed",
            error: {
              code: "transport",
              message: "Bluetooth transport failed.",
            },
          }),
        })
      )
    ).toEqual({ status: "failed", message: "Bluetooth transport failed." })
  })

  it("returns failed when session errors while source still points at BLE", () => {
    expect(
      getConnectionState(
        createRuntime({
          source: "ble",
          trainerDetails: { source: "ble", name: "KICKR CORE" },
          connection: {
            status: "error",
            reconnect: vi.fn(() => Promise.resolve({ ok: true as const })),
            disconnect: vi.fn(() => Promise.resolve()),
            error: {
              code: "transport",
              message: "Trainer disconnected unexpectedly.",
            },
          },
          connectionView: createConnectionView({
            phase: "failed",
            source: "ble",
            trainerName: "KICKR CORE",
            error: {
              code: "transport",
              message: "Trainer disconnected unexpectedly.",
            },
          }),
        })
      )
    ).toEqual({
      status: "failed",
      message: "Trainer disconnected unexpectedly.",
    })
  })
})
