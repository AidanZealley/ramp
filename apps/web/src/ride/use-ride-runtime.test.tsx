import { act, renderHook, waitFor } from "@testing-library/react"
import { StrictMode } from "react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import type * as TrainerIo from "@ramp/trainer-io"
import type { RideRuntimeController } from "./use-ride-runtime"

const { requestBleTrainer } = vi.hoisted(() => ({
  requestBleTrainer: vi.fn(),
}))

vi.mock("@ramp/trainer-io", async () => {
  const actual = await vi.importActual<typeof TrainerIo>("@ramp/trainer-io")
  return {
    ...actual,
    requestBleTrainer,
  }
})

describe("useRideRuntime", () => {
  beforeEach(() => {
    vi.resetModules()
    requestBleTrainer.mockReset()
  })

  afterEach(() => {
    Reflect.deleteProperty(navigator, "bluetooth")
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

  it("connectTrainer succeeds across StrictMode effect replay when BLE is mocked", async () => {
    Object.defineProperty(navigator, "bluetooth", {
      configurable: true,
      value: { requestDevice: vi.fn() },
    })
    const { SimulatedTrainer } = await import("@ramp/trainer-io")
    const trainer = new SimulatedTrainer()
    requestBleTrainer.mockResolvedValue(trainer)
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
