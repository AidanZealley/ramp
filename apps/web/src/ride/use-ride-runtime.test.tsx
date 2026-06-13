import { act, renderHook, waitFor } from "@testing-library/react"
import { StrictMode } from "react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import type * as TrainerIo from "@ramp/trainer-io"
import type { RideRuntimeController } from "./use-ride-runtime"

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

  it("does not expose simulator instances", async () => {
    const { useRideRuntime } = await import("./use-ride-runtime")
    const { result, unmount } = renderHook(() => useRideRuntime())

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

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
    window.localStorage.setItem(
      "ramp:lastBleTrainer",
      JSON.stringify({ id: "trainer-1", name: "Trainer One" })
    )
    Object.defineProperty(navigator, "bluetooth", {
      configurable: true,
      value: {
        requestDevice: vi.fn(),
        getDevices: vi.fn(() =>
          Promise.resolve([
            { id: "trainer-1", name: "Trainer One" } as BluetoothDevice,
          ])
        ),
      },
    })

    const { useRideRuntime } = await import("./use-ride-runtime")
    const { result, unmount } = renderHook(() => useRideRuntime())

    await waitFor(() => {
      expect(result.current.source).toBe("ble")
      expect(result.current.trainerDetails).toEqual({
        source: "ble",
        name: "Trainer One",
      })
    })

    unmount()
  })

  it("auto-connect falls back to name matching when device id changes", async () => {
    window.localStorage.setItem(
      "ramp:lastBleTrainer",
      JSON.stringify({ id: "old-trainer-id", name: "KICKR CORE" })
    )
    Object.defineProperty(navigator, "bluetooth", {
      configurable: true,
      value: {
        requestDevice: vi.fn(),
        getDevices: vi.fn(() =>
          Promise.resolve([
            { id: "new-trainer-id", name: "KICKR CORE" } as BluetoothDevice,
          ])
        ),
      },
    })

    const { useRideRuntime } = await import("./use-ride-runtime")
    const { result, unmount } = renderHook(() => useRideRuntime())

    await waitFor(() => {
      expect(result.current.source).toBe("ble")
      expect(result.current.trainerDetails).toEqual({
        source: "ble",
        name: "KICKR CORE",
      })
    })
    expect(window.localStorage.getItem("ramp:lastBleTrainer")).toBe(
      JSON.stringify({ id: "new-trainer-id", name: "KICKR CORE" })
    )

    unmount()
  })

  it("does not auto-connect when getDevices is unavailable", async () => {
    window.localStorage.setItem(
      "ramp:lastBleTrainer",
      JSON.stringify({ id: "trainer-1", name: "Trainer One" })
    )
    Object.defineProperty(navigator, "bluetooth", {
      configurable: true,
      value: { requestDevice: vi.fn() },
    })

    const { useRideRuntime } = await import("./use-ride-runtime")
    const { result, unmount } = renderHook(() => useRideRuntime())

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

    // Wait a tick to ensure auto-connect has had a chance to run
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(result.current.source).toBe("none")

    unmount()
  })

  it("does not auto-connect when saved device is not in granted list", async () => {
    window.localStorage.setItem(
      "ramp:lastBleTrainer",
      JSON.stringify({ id: "trainer-1", name: "Trainer One" })
    )
    Object.defineProperty(navigator, "bluetooth", {
      configurable: true,
      value: {
        requestDevice: vi.fn(),
        getDevices: vi.fn(() =>
          Promise.resolve([
            { id: "trainer-2", name: "Trainer Two" } as BluetoothDevice,
          ])
        ),
      },
    })

    const { useRideRuntime } = await import("./use-ride-runtime")
    const { result, unmount } = renderHook(() => useRideRuntime())

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

    // Wait a tick to ensure auto-connect has had a chance to run
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(result.current.source).toBe("none")

    unmount()
  })

  it("connectTrainer succeeds across StrictMode effect replay when BLE is mocked", async () => {
    Object.defineProperty(navigator, "bluetooth", {
      configurable: true,
      value: { requestDevice: vi.fn() },
    })
    requestBleDevice.mockResolvedValue({
      id: "trainer-1",
      name: "Trainer One",
    })
    const { useRideRuntime } = await import("./use-ride-runtime")
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    )
    const { result, unmount } = renderHook(() => useRideRuntime(), { wrapper })

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
      expect(result.current.bleAvailable).toBe(true)
    })

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
    expect(window.localStorage.getItem("ramp:lastBleTrainer")).toBe(
      JSON.stringify({ id: "trainer-1", name: "Trainer One" })
    )

    unmount()
  })

  it("connectTrainer returns unsupported failure when BLE is unavailable", async () => {
    const { useRideRuntime } = await import("./use-ride-runtime")
    const { result, unmount } = renderHook(() => useRideRuntime())

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
      expect(result.current.bleAvailable).toBe(false)
    })

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
    Object.defineProperty(navigator, "bluetooth", {
      configurable: true,
      value: { requestDevice: vi.fn() },
    })
    const error = {
      code: "unsupported",
      message: "Web Bluetooth is unsupported on this browser or platform.",
    }
    requestBleDevice.mockRejectedValue(error)
    const { useRideRuntime } = await import("./use-ride-runtime")
    const { result, unmount } = renderHook(() => useRideRuntime())

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
      expect(result.current.bleAvailable).toBe(true)
    })

    await act(async () => {
      await expect(result.current.connectTrainer()).resolves.toEqual({
        ok: false,
        error,
      })
    })
    await waitFor(() => {
      expect(result.current.connectionError).toBe(error.message)
    })

    unmount()
  })

  it("preserves typed transport errors from BLE selection", async () => {
    Object.defineProperty(navigator, "bluetooth", {
      configurable: true,
      value: { requestDevice: vi.fn() },
    })
    const error = {
      code: "transport",
      message: "Trainer communication failed.",
    }
    requestBleDevice.mockRejectedValue(error)
    const { useRideRuntime } = await import("./use-ride-runtime")
    const { result, unmount } = renderHook(() => useRideRuntime())

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
      expect(result.current.bleAvailable).toBe(true)
    })

    await act(async () => {
      await expect(result.current.connectTrainer()).resolves.toEqual({
        ok: false,
        error,
      })
    })
    await waitFor(() => {
      expect(result.current.connectionError).toBe(error.message)
    })

    unmount()
  })

  it("useSimulatorTrainer succeeds across StrictMode effect replay in dev mode", async () => {
    const { useRideRuntime } = await import("./use-ride-runtime")
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    )
    const { result, unmount } = renderHook(() => useRideRuntime(), { wrapper })

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
      expect(result.current.session).not.toBeNull()
    })

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

  it("actions return a typed failure while the session is not ready", async () => {
    const { useRideRuntime } = await import("./use-ride-runtime")
    const { result, unmount } = renderHook(() => useRideRuntime())

    if (result.current.ready) {
      unmount()
      return
    }

    const failure = {
      ok: false,
      error: {
        code: "transport",
        message: "Ride session is still initializing.",
      },
    } as const

    await expect(result.current.connectTrainer()).resolves.toEqual(failure)
    await expect(result.current.useSimulatorTrainer()).resolves.toEqual(failure)

    unmount()
  })

  it("keeps BLE availability SSR-safe", async () => {
    Object.defineProperty(navigator, "bluetooth", {
      configurable: true,
      value: { requestDevice: vi.fn() },
    })
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

    const { result, unmount } = renderHook(() => useRideRuntime())

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
      expect(result.current.bleAvailable).toBe(true)
    })

    unmount()
  })

  it("disconnectTrainer clears connection state", async () => {
    const { useRideRuntime } = await import("./use-ride-runtime")
    const { result, unmount } = renderHook(() => useRideRuntime())

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

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
    Object.defineProperty(navigator, "bluetooth", {
      configurable: true,
      value: { requestDevice: vi.fn() },
    })

    let resolveDevice: (device: BluetoothDevice) => void = () => undefined
    requestBleDevice.mockImplementation(
      () =>
        new Promise<BluetoothDevice>((resolve) => {
          resolveDevice = resolve
        })
    )

    const { useRideRuntime } = await import("./use-ride-runtime")
    const { result, unmount } = renderHook(() => useRideRuntime())

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

    // Start connecting (but don't await)
    const connectPromise = act(async () => {
      return result.current.connectTrainer()
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
