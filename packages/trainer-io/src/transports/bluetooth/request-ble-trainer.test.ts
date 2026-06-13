import { afterEach, describe, expect, it, vi } from "vitest"
import {
  getGrantedBleDevices,
  isWebBluetoothAvailable,
  mapWebBluetoothError,
  requestBleDevice,
} from "./web-bluetooth/request-device"

const originalNavigator = globalThis.navigator

describe("Web Bluetooth request helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    })
  })

  it("reports availability from navigator.bluetooth", () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        bluetooth: {
          requestDevice: vi.fn(),
        },
      },
    })

    expect(isWebBluetoothAvailable()).toBe(true)
  })

  it("maps chooser cancellation to permission", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    vi.spyOn(console, "info").mockImplementation(() => undefined)
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        bluetooth: {
          requestDevice: vi.fn(),
        },
      },
    })

    await expect(
      requestBleDevice({
        requestDevice: () =>
          Promise.reject(new DOMException("cancelled", "NotFoundError")),
      })
    ).rejects.toMatchObject({ code: "permission" })
  })

  it("maps missing navigator.bluetooth to unsupported", async () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {},
    })

    await expect(requestBleDevice()).rejects.toMatchObject({
      code: "unsupported",
    })
  })

  it("returns granted Bluetooth devices", async () => {
    const devices = [
      { id: "trainer-1", name: "Trainer One" },
      { id: "trainer-2", name: "Trainer Two" },
    ] as Array<BluetoothDevice>
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        bluetooth: {
          getDevices: vi.fn(() => Promise.resolve(devices)),
        },
      },
    })

    await expect(getGrantedBleDevices()).resolves.toBe(devices)
  })

  it("maps missing granted-device lookup to unsupported", async () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        bluetooth: {
          requestDevice: vi.fn(),
        },
      },
    })

    await expect(getGrantedBleDevices()).rejects.toMatchObject({
      code: "unsupported",
    })
  })

  it("preserves timeout mapping", () => {
    expect(
      mapWebBluetoothError({ code: "timeout", message: "late" }, "timeout")
    ).toMatchObject({ code: "timeout" })
  })
})
