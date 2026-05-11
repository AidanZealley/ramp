import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SimulatedTrainer } from "@ramp/trainer-io"
import type * as RampTrainerIo from "@ramp/trainer-io"

const requestBleTrainer = vi.fn()
const isWebBluetoothAvailable = vi.fn()

vi.mock("@ramp/trainer-io", async () => {
  const actual: typeof RampTrainerIo = await vi.importActual("@ramp/trainer-io")
  return {
    ...actual,
    requestBleTrainer: (...args: Array<unknown>) => requestBleTrainer(...args),
    isWebBluetoothAvailable: () => isWebBluetoothAvailable(),
  }
})

describe("useRideTrainer", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    requestBleTrainer.mockReset()
    isWebBluetoothAvailable.mockReset()
    isWebBluetoothAvailable.mockReturnValue(true)
  })

  it("defaults to simulator selection without selecting a trainer in dev mode", async () => {
    vi.stubEnv("VITE_RIDE_DEV_SIMULATION", "true")
    const { useRideTrainer } = await import("./use-ride-trainer")
    const { result } = renderHook(() => useRideTrainer())

    expect(result.current.source).toBe("none")
    expect(result.current.selectedSource).toBe("simulated")
    expect(result.current.trainer).toBeNull()
    expect(result.current.simulatedRider).toBe(
      result.current.simulatedTrainer?.rider
    )
  })

  it("connects the selected simulator in dev mode", async () => {
    vi.stubEnv("VITE_RIDE_DEV_SIMULATION", "true")
    const { useRideTrainer } = await import("./use-ride-trainer")
    const { result } = renderHook(() => useRideTrainer())

    await act(async () => {
      await expect(result.current.connectSelectedTrainer()).resolves.toBe(true)
    })

    expect(result.current.source).toBe("simulated")
    expect(result.current.trainer).toBeInstanceOf(SimulatedTrainer)
  })

  it("defaults to no trainer and BLE selection when the dev flag is disabled", async () => {
    vi.stubEnv("VITE_RIDE_DEV_SIMULATION", "false")
    const { useRideTrainer } = await import("./use-ride-trainer")
    const { result } = renderHook(() => useRideTrainer())

    expect(result.current.source).toBe("none")
    expect(result.current.selectedSource).toBe("ble")
    expect(result.current.trainer).toBeNull()
  })

  it("only switches to BLE after an explicit user action", async () => {
    vi.stubEnv("VITE_RIDE_DEV_SIMULATION", "true")
    const { useRideTrainer } = await import("./use-ride-trainer")
    const bleTrainer = {
      kind: "ftms-ble",
      capabilities: new Set(),
      state: { kind: "disconnected" as const },
      connect: vi.fn(() => Promise.resolve(undefined)),
      disconnect: vi.fn(() => Promise.resolve(undefined)),
      sendCommand: vi.fn(() => Promise.resolve(undefined)),
      subscribeTelemetry: vi.fn(() => () => undefined),
      subscribeState: vi.fn(() => () => undefined),
      subscribeError: vi.fn(() => () => undefined),
    }
    requestBleTrainer.mockResolvedValue(bleTrainer)

    const { result } = renderHook(() => useRideTrainer())

    expect(requestBleTrainer).not.toHaveBeenCalled()

    act(() => {
      result.current.selectSource("ble")
    })
    await act(async () => {
      await result.current.connectSelectedTrainer()
    })

    expect(requestBleTrainer).toHaveBeenCalledTimes(1)
    expect(result.current.trainer).toBe(bleTrainer)
    expect(result.current.source).toBe("ble")
  })

  it("keeps no trainer selected when BLE is unavailable and the flag is disabled", async () => {
    vi.stubEnv("VITE_RIDE_DEV_SIMULATION", "false")
    isWebBluetoothAvailable.mockReturnValue(false)
    const { useRideTrainer } = await import("./use-ride-trainer")
    const { result } = renderHook(() => useRideTrainer())

    await act(async () => {
      await result.current.connectBleTrainer()
    })

    expect(result.current.trainer).toBeNull()
    expect(result.current.source).toBe("none")
    expect(result.current.connectionError).toBe(
      "Web Bluetooth requires a Chromium-class browser."
    )
    expect(requestBleTrainer).not.toHaveBeenCalled()
  })

  it("keeps no active source when BLE selection is cancelled before connection", async () => {
    vi.stubEnv("VITE_RIDE_DEV_SIMULATION", "true")
    const { useRideTrainer } = await import("./use-ride-trainer")
    requestBleTrainer.mockRejectedValue(new Error("cancelled"))
    const { result } = renderHook(() => useRideTrainer())

    act(() => {
      result.current.selectSource("ble")
    })
    await act(async () => {
      await result.current.connectBleTrainer()
    })

    expect(result.current.trainer).toBeNull()
    expect(result.current.source).toBe("none")
    expect(result.current.connectionError).toBe(
      "Bluetooth trainer selection was cancelled."
    )
  })

  it("keeps a prior source when BLE selection is cancelled", async () => {
    vi.stubEnv("VITE_RIDE_DEV_SIMULATION", "true")
    const { useRideTrainer } = await import("./use-ride-trainer")
    requestBleTrainer.mockRejectedValue(new Error("cancelled"))
    const { result } = renderHook(() => useRideTrainer())

    await act(async () => {
      await result.current.useSimulatedTrainer()
    })
    await act(async () => {
      await result.current.connectBleTrainer()
    })

    expect(result.current.trainer).toBeInstanceOf(SimulatedTrainer)
    expect(result.current.source).toBe("simulated")
  })

  it("switches back to the simulator after disconnecting the active BLE trainer", async () => {
    vi.stubEnv("VITE_RIDE_DEV_SIMULATION", "true")
    const { useRideTrainer } = await import("./use-ride-trainer")
    const bleTrainer = {
      kind: "ftms-ble",
      capabilities: new Set(),
      state: { kind: "disconnected" as const },
      connect: vi.fn(() => Promise.resolve(undefined)),
      disconnect: vi.fn(() => Promise.resolve(undefined)),
      sendCommand: vi.fn(() => Promise.resolve(undefined)),
      subscribeTelemetry: vi.fn(() => () => undefined),
      subscribeState: vi.fn(() => () => undefined),
      subscribeError: vi.fn(() => () => undefined),
    }
    requestBleTrainer.mockResolvedValue(bleTrainer)
    const { result } = renderHook(() => useRideTrainer())

    await act(async () => {
      await result.current.connectBleTrainer()
    })
    await act(async () => {
      await result.current.useSimulatedTrainer()
    })

    expect(bleTrainer.disconnect).toHaveBeenCalledTimes(1)
    expect(result.current.trainer).toBeInstanceOf(SimulatedTrainer)
    expect(result.current.source).toBe("simulated")
  })

  it("disconnect leaves the source as none", async () => {
    vi.stubEnv("VITE_RIDE_DEV_SIMULATION", "true")
    const { useRideTrainer } = await import("./use-ride-trainer")
    const { result } = renderHook(() => useRideTrainer())

    await act(async () => {
      await result.current.useSimulatedTrainer()
    })

    await act(async () => {
      await result.current.disconnectTrainer()
    })

    expect(result.current.source).toBe("none")
    expect(result.current.trainer).toBeNull()
  })

  it("coalesces rapid repeated BLE connect requests", async () => {
    vi.stubEnv("VITE_RIDE_DEV_SIMULATION", "true")
    const { useRideTrainer } = await import("./use-ride-trainer")
    let resolveTrainer:
      | ((trainer: {
          kind: "ftms-ble"
          capabilities: Set<never>
          state: { kind: "disconnected" }
          connect: ReturnType<typeof vi.fn>
          disconnect: ReturnType<typeof vi.fn>
          sendCommand: ReturnType<typeof vi.fn>
          subscribeTelemetry: ReturnType<typeof vi.fn>
          subscribeState: ReturnType<typeof vi.fn>
          subscribeError: ReturnType<typeof vi.fn>
        }) => void)
      | null = null
    requestBleTrainer.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTrainer = resolve
        })
    )
    const { result } = renderHook(() => useRideTrainer())

    let first: Promise<boolean>
    let second: Promise<boolean>
    await act(() => {
      first = result.current.connectBleTrainer()
      second = result.current.connectBleTrainer()
    })

    expect(requestBleTrainer).toHaveBeenCalledTimes(1)
    await expect(second!).resolves.toBe(false)

    await act(async () => {
      resolveTrainer?.({
        kind: "ftms-ble",
        capabilities: new Set(),
        state: { kind: "disconnected" },
        connect: vi.fn(() => Promise.resolve(undefined)),
        disconnect: vi.fn(() => Promise.resolve(undefined)),
        sendCommand: vi.fn(() => Promise.resolve(undefined)),
        subscribeTelemetry: vi.fn(() => () => undefined),
        subscribeState: vi.fn(() => () => undefined),
        subscribeError: vi.fn(() => () => undefined),
      })
      await first!
    })

    expect(result.current.selectingBleTrainer).toBe(false)
    expect(result.current.trainer).not.toBeInstanceOf(SimulatedTrainer)
    expect(result.current.source).toBe("ble")
  })
})
