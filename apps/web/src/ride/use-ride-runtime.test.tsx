import { act, renderHook, waitFor } from "@testing-library/react"
import { StrictMode } from "react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import type * as TrainerIo from "@ramp/trainer-io"
import type { RideRuntimeController } from "./use-ride-runtime"
import {
  createMockTrainer,
  mockBluetooth,
  mockGrantedBleDevices,
  renderRideRuntime,
  saveBleTrainer,
  savedTrainerStorageKey,
  waitForBleConnection,
  waitForIdleConnection,
} from "./test-utils/ride-runtime-test-helpers"
import type { TrainerError } from "@ramp/trainer-io"

const { requestBleDevice } = vi.hoisted(() => ({
  requestBleDevice: vi.fn(),
}))

vi.mock("@ramp/trainer-io", async () => {
  const actual = await vi.importActual<typeof TrainerIo>("@ramp/trainer-io")
  return {
    ...actual,
    FtmsBleTrainer: vi.fn(() => new actual.SimulatedTrainer()),
    requestBleDevice,
  }
})

describe("useRideRuntime", () => {
  beforeEach(() => {
    vi.resetModules()
    requestBleDevice.mockReset()
    window.localStorage.clear()
  })

  afterEach(() => {
    Reflect.deleteProperty(navigator, "bluetooth")
    window.localStorage.clear()
  })

  async function expectManualSelectionFailure({
    error,
    visibleError,
    phase,
  }: {
    error: TrainerError
    visibleError: string | null
    phase: RideRuntimeController["connectionView"]["phase"]
  }) {
    mockBluetooth({ requestDevice: vi.fn() })
    requestBleDevice.mockRejectedValue(error)

    const { result, unmount } = await renderRideRuntime()
    expect(result.current.bleAvailable).toBe(true)

    await act(async () => {
      await expect(result.current.connectTrainer()).resolves.toEqual({
        ok: false,
        error,
      })
    })
    await waitFor(() => {
      expect(result.current.connectionError).toBe(visibleError)
      expect(result.current.connectionView.phase).toBe(phase)
    })

    unmount()
  }

  async function renderStrictRideRuntime() {
    const { useRideRuntime } = await import("./use-ride-runtime")
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    )
    const rendered = renderHook(() => useRideRuntime(), { wrapper })
    await waitFor(() => {
      expect(rendered.result.current.ready).toBe(true)
    })
    return rendered
  }

  it("does not expose simulator instances", async () => {
    const { result, unmount } = await renderRideRuntime()

    expect("simulatedTrainer" in result.current).toBe(false)
    expect("simulatedRider" in result.current).toBe(false)

    unmount()
  })

  it("is initially pending and then ready", async () => {
    const { useRideRuntime } = await import("./use-ride-runtime")
    const serverSnapshot: { current: RideRuntimeController | null } = {
      current: null,
    }
    function ServerSnapshot() {
      serverSnapshot.current = useRideRuntime()
      return null
    }

    renderToString(<ServerSnapshot />)
    expect(serverSnapshot.current?.ready).toBe(false)
    expect(serverSnapshot.current?.session).toBeNull()

    const { result, unmount } = renderHook(() => useRideRuntime())

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
      expect(result.current.session).not.toBeNull()
    })

    unmount()
  })

  it("auto-connects with a saved BLE device on mount", async () => {
    saveBleTrainer("trainer-1", "Trainer One")
    mockGrantedBleDevices([{ id: "trainer-1", name: "Trainer One" }])

    const { result, unmount } = await renderRideRuntime()

    await waitForBleConnection(result, "Trainer One")

    unmount()
  })

  it("auto-connect falls back to name matching when device id changes", async () => {
    saveBleTrainer("old-trainer-id", "KICKR CORE")
    mockGrantedBleDevices([{ id: "new-trainer-id", name: "KICKR CORE" }])

    const { result, unmount } = await renderRideRuntime()

    await waitForBleConnection(result, "KICKR CORE")
    expect(window.localStorage.getItem(savedTrainerStorageKey)).toBe(
      JSON.stringify({ id: "new-trainer-id", name: "KICKR CORE" })
    )

    unmount()
  })

  it("does not auto-connect when getDevices is unavailable", async () => {
    saveBleTrainer("trainer-1", "Trainer One")
    mockBluetooth({ requestDevice: vi.fn() })

    const { result, unmount } = await renderRideRuntime()

    expect(result.current.source).toBe("none")
    expect(result.current.connectionView.phase).toBe("idle")
    expect(window.localStorage.getItem(savedTrainerStorageKey)).toBe(
      JSON.stringify({ id: "trainer-1", name: "Trainer One" })
    )

    unmount()
  })

  it("does not auto-connect when saved device is not in granted list", async () => {
    saveBleTrainer("trainer-1", "Trainer One")
    mockGrantedBleDevices([{ id: "trainer-2", name: "Trainer Two" }])

    const { result, unmount } = await renderRideRuntime()

    await waitForIdleConnection(result)
    expect(window.localStorage.getItem(savedTrainerStorageKey)).toBeNull()

    unmount()
  })

  it("clears failed saved-device auto-connect attempts", async () => {
    saveBleTrainer("trainer-1", "Failing Trainer")
    mockGrantedBleDevices([{ id: "trainer-1", name: "Failing Trainer" }])

    const { FtmsBleTrainer } = await import("@ramp/trainer-io")
    vi.mocked(FtmsBleTrainer).mockImplementationOnce(
      () =>
        createMockTrainer({
          connect: vi.fn(() =>
            Promise.reject({
              code: "transport",
              message: "Bluetooth transport operation failed.",
            })
          ),
        }) as never
    )

    const { result, unmount } = await renderRideRuntime()

    await waitFor(() => {
      expect(result.current.connectionError).toBeNull()
      expect(result.current.connection.status).toBe("disconnected")
      expect(window.localStorage.getItem(savedTrainerStorageKey)).toBeNull()
    })

    unmount()
  })

  it("connectTrainer succeeds across StrictMode effect replay when BLE is mocked", async () => {
    mockBluetooth({ requestDevice: vi.fn() })
    requestBleDevice.mockResolvedValue({
      id: "trainer-1",
      name: "Trainer One",
    })
    const { result, unmount } = await renderStrictRideRuntime()

    expect(result.current.bleAvailable).toBe(true)

    let connectResult: Awaited<ReturnType<typeof result.current.connectTrainer>>
    await act(async () => {
      connectResult = await result.current.connectTrainer()
    })

    expect(connectResult!).toEqual({ ok: true })
    await waitFor(() => {
      expect(result.current.source).toBe("ble")
      expect(result.current.connection.status).toBe("connected")
      expect(result.current.trainerDetails).toEqual({
        source: "ble",
        name: "Trainer One",
      })
    })
    expect(window.localStorage.getItem(savedTrainerStorageKey)).toBe(
      JSON.stringify({ id: "trainer-1", name: "Trainer One" })
    )

    unmount()
  })

  it("connectTrainer returns unsupported failure when BLE is unavailable", async () => {
    const { result, unmount } = await renderRideRuntime()
    expect(result.current.bleAvailable).toBe(false)

    await expect(result.current.connectTrainer()).resolves.toEqual({
      ok: false,
      error: {
        code: "unsupported",
        message: "Web Bluetooth requires a Chromium-class browser.",
      },
    })

    unmount()
  })

  it("preserves typed unsupported errors from BLE selection", async () => {
    const error = {
      code: "unsupported",
      message: "Web Bluetooth is unsupported on this browser or platform.",
    } satisfies TrainerError

    await expectManualSelectionFailure({
      error,
      visibleError: error.message,
      phase: "failed",
    })
  })

  it("preserves typed transport errors from BLE selection", async () => {
    const error = {
      code: "transport",
      message: "Trainer communication failed.",
    } satisfies TrainerError

    await expectManualSelectionFailure({
      error,
      visibleError: error.message,
      phase: "failed",
    })
  })

  it("returns manual chooser cancellation to idle without visible error", async () => {
    const error = {
      code: "cancelled",
      message: "Bluetooth trainer selection was cancelled.",
    } satisfies TrainerError

    await expectManualSelectionFailure({
      error,
      visibleError: null,
      phase: "idle",
    })
  })

  it("shows permission denial as a failed manual connection", async () => {
    const error = {
      code: "permission",
      message: "Bluetooth permission was denied.",
    } satisfies TrainerError

    await expectManualSelectionFailure({
      error,
      visibleError: error.message,
      phase: "failed",
    })
  })

  it("ignores stale auto-connect results after a manual connect starts", async () => {
    saveBleTrainer("auto-trainer", "Auto Trainer")
    mockGrantedBleDevices([{ id: "auto-trainer", name: "Auto Trainer" }])
    requestBleDevice.mockResolvedValue({
      id: "manual-trainer",
      name: "Manual Trainer",
    })

    let resolveAutoConnect: () => void = () => undefined
    const { FtmsBleTrainer } = await import("@ramp/trainer-io")
    vi.mocked(FtmsBleTrainer).mockImplementationOnce(
      () =>
        createMockTrainer({
          connect: vi.fn(
            () =>
              new Promise<void>((resolve) => {
                resolveAutoConnect = resolve
              })
          ),
        }) as never
    )

    const { result, unmount } = await renderRideRuntime()

    await waitFor(() => {
      expect(result.current.connectionView.phase).toBe("connecting")
      expect(result.current.trainerDetails).toEqual({
        source: "ble",
        name: "Auto Trainer",
      })
    })

    await act(async () => {
      await expect(result.current.connectTrainer()).resolves.toEqual({
        ok: true,
      })
    })
    await waitForBleConnection(result, "Manual Trainer")
    expect(result.current.connectionView.phase).toBe("connected")

    await act(async () => {
      resolveAutoConnect()
    })
    await waitFor(() => {
      expect(result.current.trainerDetails).toEqual({
        source: "ble",
        name: "Manual Trainer",
      })
      expect(window.localStorage.getItem(savedTrainerStorageKey)).toBe(
        JSON.stringify({ id: "manual-trainer", name: "Manual Trainer" })
      )
    })

    unmount()
  })

  it("useSimulatorTrainer succeeds across StrictMode effect replay in dev mode", async () => {
    const { result, unmount } = await renderStrictRideRuntime()
    expect(result.current.session).not.toBeNull()

    let connectResult: Awaited<
      ReturnType<typeof result.current.useSimulatorTrainer>
    >
    await act(async () => {
      connectResult = await result.current.useSimulatorTrainer()
    })

    expect(connectResult!).toEqual({ ok: true })
    await waitFor(() => {
      expect(result.current.source).toBe("simulated")
      expect(result.current.connection.status).toBe("connected")
    })

    unmount()
  })

  it("actions return a typed failure before client session effects run", async () => {
    const { useRideRuntime } = await import("./use-ride-runtime")
    const serverSnapshot: { current: RideRuntimeController | null } = {
      current: null,
    }
    function ServerSnapshot() {
      serverSnapshot.current = useRideRuntime()
      return null
    }
    renderToString(<ServerSnapshot />)

    const failure = {
      ok: false,
      error: {
        code: "transport",
        message: "Ride session is still initializing.",
      },
    } as const

    await expect(serverSnapshot.current?.connectTrainer()).resolves.toEqual(
      failure
    )
    await expect(
      serverSnapshot.current?.useSimulatorTrainer()
    ).resolves.toEqual(failure)
  })

  it("keeps BLE availability SSR-safe", async () => {
    mockBluetooth({ requestDevice: vi.fn() })
    const { useRideRuntime } = await import("./use-ride-runtime")

    const serverSnapshot: { current: RideRuntimeController | null } = {
      current: null,
    }
    function ServerSnapshot() {
      serverSnapshot.current = useRideRuntime()
      return null
    }
    renderToString(<ServerSnapshot />)
    expect(serverSnapshot.current?.session).toBeNull()
    expect(serverSnapshot.current?.bleAvailable).toBe(false)

    const { result, unmount } = await renderRideRuntime()
    expect(result.current.bleAvailable).toBe(true)

    unmount()
  })

  it("disconnectTrainer clears connection state", async () => {
    const { result, unmount } = await renderRideRuntime()

    await act(async () => {
      await result.current.useSimulatorTrainer()
    })

    expect(result.current.source).toBe("simulated")

    await act(async () => {
      await result.current.disconnectTrainer()
    })

    expect(result.current.source).toBe("none")
    expect(result.current.trainerDetails).toBeNull()
    expect(result.current.connectionError).toBeNull()

    unmount()
  })

  it("cancelConnection stops an in-progress connection", async () => {
    mockBluetooth({ requestDevice: vi.fn() })

    let resolveDevice: (device: BluetoothDevice) => void = () => undefined
    requestBleDevice.mockImplementation(
      () =>
        new Promise<BluetoothDevice>((resolve) => {
          resolveDevice = resolve
        })
    )

    const { result, unmount } = await renderRideRuntime()
    expect(result.current.bleAvailable).toBe(true)

    // Start connecting (but don't await)
    let connectPromise!: Promise<
      Awaited<ReturnType<typeof result.current.connectTrainer>>
    >
    await act(async () => {
      connectPromise = result.current.connectTrainer()
    })

    await waitFor(() => {
      expect(result.current.selectingTrainer).toBe(true)
    })

    // Cancel
    await act(async () => {
      await result.current.cancelConnection()
    })

    expect(result.current.selectingTrainer).toBe(false)
    expect(result.current.source).toBe("none")

    // Resolve the pending request to clean up
    resolveDevice({ id: "trainer-1", name: "Trainer One" } as BluetoothDevice)
    await connectPromise

    unmount()
  })
})
