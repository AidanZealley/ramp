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

  it("initializes auto-connect state", async () => {
    const { useRideRuntime } = await import("./use-ride-runtime")
    const { result, unmount } = renderHook(() => useRideRuntime())

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

    expect(result.current.autoConnect).toMatchObject({
      status: "idle",
      attempted: false,
      suppressed: false,
      lastTrainer: null,
      error: null,
    })

    unmount()
  })

  it("auto-connect succeeds with a saved BLE id and granted device", async () => {
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
      expect(result.current.autoConnect.status).toBe("succeeded")
      expect(result.current.source).toBe("ble")
    })

    unmount()
  })

  it("auto-connect is unavailable when granted-device lookup is missing", async () => {
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
      expect(result.current.autoConnect.status).toBe("unavailable")
      expect(result.current.autoConnect.attempted).toBe(true)
    })

    unmount()
  })

  it("auto-connect fails when the saved device is absent", async () => {
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
      expect(result.current.autoConnect.status).toBe("failed")
      expect(result.current.source).toBe("none")
    })

    unmount()
  })

  it("cancel auto-connect suppresses the branch attempt", async () => {
    window.localStorage.setItem(
      "ramp:lastBleTrainer",
      JSON.stringify({ id: "trainer-1", name: "Trainer One" })
    )
    let resolveDevices: (devices: Array<BluetoothDevice>) => void =
      () => undefined
    Object.defineProperty(navigator, "bluetooth", {
      configurable: true,
      value: {
        requestDevice: vi.fn(),
        getDevices: vi.fn(
          () =>
            new Promise<Array<BluetoothDevice>>((resolve) => {
              resolveDevices = resolve
            })
        ),
      },
    })

    const { useRideRuntime } = await import("./use-ride-runtime")
    const { result, unmount } = renderHook(() => useRideRuntime())

    await waitFor(() => {
      expect(result.current.autoConnect.status).toBe("checking")
    })

    await act(async () => {
      await result.current.autoConnect.cancel()
      resolveDevices([
        { id: "trainer-1", name: "Trainer One" } as BluetoothDevice,
      ])
    })

    await waitFor(() => {
      expect(result.current.autoConnect.status).toBe("cancelled")
      expect(result.current.autoConnect.suppressed).toBe(true)
      expect(result.current.source).toBe("none")
    })

    unmount()
  })

  it("manual simulator cancels in-flight auto-connect first", async () => {
    window.localStorage.setItem(
      "ramp:lastBleTrainer",
      JSON.stringify({ id: "trainer-1", name: "Trainer One" })
    )
    Object.defineProperty(navigator, "bluetooth", {
      configurable: true,
      value: {
        requestDevice: vi.fn(),
        getDevices: vi.fn(
          () => new Promise<Array<BluetoothDevice>>(() => undefined)
        ),
      },
    })

    const { useRideRuntime } = await import("./use-ride-runtime")
    const { result, unmount } = renderHook(() => useRideRuntime())

    await waitFor(() => {
      expect(result.current.autoConnect.status).toBe("checking")
    })

    await act(async () => {
      await result.current.useSimulatorTrainer()
    })

    await waitFor(() => {
      expect(result.current.autoConnect.status).toBe("cancelled")
      expect(result.current.autoConnect.suppressed).toBe(true)
      expect(result.current.source).toBe("simulated")
    })

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
})
