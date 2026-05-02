import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MockTrainer } from "@ramp/trainer-io"
import { useRideTrainer } from "./use-ride-trainer"
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
    requestBleTrainer.mockReset()
    isWebBluetoothAvailable.mockReset()
    isWebBluetoothAvailable.mockReturnValue(true)
  })

  it("defaults to the mock trainer", () => {
    const { result } = renderHook(() => useRideTrainer())

    expect(result.current.trainer).toBeInstanceOf(MockTrainer)
  })

  it("only switches to BLE after an explicit user action", async () => {
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

    await act(async () => {
      await result.current.connectBleTrainer()
    })

    expect(requestBleTrainer).toHaveBeenCalledTimes(1)
    expect(result.current.trainer).toBe(bleTrainer)
  })

  it("keeps the mock trainer selected when BLE is unavailable", async () => {
    isWebBluetoothAvailable.mockReturnValue(false)
    const { result } = renderHook(() => useRideTrainer())

    await act(async () => {
      await result.current.connectBleTrainer()
    })

    expect(result.current.trainer).toBeInstanceOf(MockTrainer)
    expect(requestBleTrainer).not.toHaveBeenCalled()
  })

  it("keeps the app functional when the chooser is cancelled", async () => {
    requestBleTrainer.mockRejectedValue(new Error("cancelled"))
    const { result } = renderHook(() => useRideTrainer())

    await act(async () => {
      await result.current.connectBleTrainer()
    })

    expect(result.current.trainer).toBeInstanceOf(MockTrainer)
  })

  it("switches back to the mock trainer after disconnecting the active BLE trainer", async () => {
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
      await result.current.useMockTrainer()
    })

    expect(bleTrainer.disconnect).toHaveBeenCalledTimes(1)
    expect(result.current.trainer).toBeInstanceOf(MockTrainer)
  })

  it("coalesces rapid repeated BLE connect requests", async () => {
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
    expect(result.current.trainer).not.toBeInstanceOf(MockTrainer)
  })
})
