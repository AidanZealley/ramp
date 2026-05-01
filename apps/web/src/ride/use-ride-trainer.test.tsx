import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MockTrainer } from "@ramp/trainer-io"
import { useRideTrainer } from "./use-ride-trainer"

const requestBleTrainer = vi.fn()
const isWebBluetoothAvailable = vi.fn()

vi.mock("@ramp/trainer-io", async () => {
  const actual =
    await vi.importActual<typeof import("@ramp/trainer-io")>("@ramp/trainer-io")
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
      connect: vi.fn(async () => undefined),
      disconnect: vi.fn(async () => undefined),
      sendCommand: vi.fn(async () => undefined),
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
})
