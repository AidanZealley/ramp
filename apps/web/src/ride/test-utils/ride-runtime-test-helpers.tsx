import { act, renderHook, waitFor } from "@testing-library/react"
import { expect } from "vitest"
import type { RenderHookResult } from "@testing-library/react"
import { vi, type Mock } from "vitest"
import type { RideRuntimeController } from "../use-ride-runtime"
import type { RideConnectionView } from "../trainer-connection/types"
import type { TrainerSource } from "@ramp/trainer-io"

export const savedTrainerStorageKey = "ramp:lastBleTrainer"

export function createConnectionView(
  patch: Partial<RideConnectionView> = {}
): RideConnectionView {
  return {
    phase: "idle",
    source: "none",
    trainerName: null,
    error: null,
    bleAvailable: true,
    canConnectBle: true,
    canUseSimulator: true,
    canCancel: false,
    ...patch,
  }
}

export function createRuntimeController(
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
    connectionView: createConnectionView(),
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

export function saveBleTrainer(id: string, name: string | null): void {
  window.localStorage.setItem(
    savedTrainerStorageKey,
    JSON.stringify({ id, name })
  )
}

export function mockBluetooth(options: {
  requestDevice?: Mock
  getDevices?: Mock
}): void {
  Object.defineProperty(navigator, "bluetooth", {
    configurable: true,
    value: {
      requestDevice: options.requestDevice ?? (() => Promise.resolve()),
      ...(options.getDevices ? { getDevices: options.getDevices } : {}),
    },
  })
}

export function mockGrantedBleDevices(
  devices: Array<Pick<BluetoothDevice, "id" | "name">>
): void {
  mockBluetooth({
    requestDevice: vi.fn(),
    getDevices: vi.fn(() => Promise.resolve(devices as Array<BluetoothDevice>)),
  })
}

export function createMockTrainer(
  patch: Partial<TrainerSource> = {}
): TrainerSource {
  return {
    kind: "ftms-ble",
    capabilities: new Set(),
    state: { kind: "disconnected" },
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    sendCommand: () => Promise.resolve(),
    subscribeTelemetry: () => () => undefined,
    subscribeState: () => () => undefined,
    subscribeError: () => () => undefined,
    ...patch,
  }
}

export async function renderRideRuntime(): Promise<
  RenderHookResult<RideRuntimeController, unknown>
> {
  const { useRideRuntime } = await import("../use-ride-runtime")
  const rendered = renderHook(() => useRideRuntime())
  await waitFor(() => {
    expect(rendered.result.current.ready).toBe(true)
  })
  return rendered
}

export async function connectSimulator(
  runtime: RideRuntimeController
): Promise<void> {
  await act(async () => {
    await runtime.useSimulatorTrainer()
  })
}

export async function waitForAutoConnectSettled(
  result: RenderHookResult<RideRuntimeController, unknown>["result"]
): Promise<void> {
  await waitFor(() => {
    expect(result.current.selectingTrainer).toBe(false)
    expect(result.current.connecting).toBe(false)
  })
}

export async function waitForBleConnection(
  result: RenderHookResult<RideRuntimeController, unknown>["result"],
  name: string
): Promise<void> {
  await waitFor(() => {
    expect(result.current.source).toBe("ble")
    expect(result.current.trainerDetails).toEqual({ source: "ble", name })
  })
}

export async function waitForIdleConnection(
  result: RenderHookResult<RideRuntimeController, unknown>["result"]
): Promise<void> {
  await waitFor(() => {
    expect(result.current.source).toBe("none")
    expect(result.current.connectionView.phase).toBe("idle")
  })
}
