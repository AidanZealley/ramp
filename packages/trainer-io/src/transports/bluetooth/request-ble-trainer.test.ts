import { afterEach, describe, expect, it, vi } from "vitest"
import {
  isWebBluetoothAvailable,
  mapWebBluetoothError,
  requestBleDevice,
} from "./web-bluetooth/request-device"

const originalNavigator = globalThis.navigator

describe("Web Bluetooth request helpers", () => {
  afterEach(() => {
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

  it("preserves timeout mapping", () => {
    expect(
      mapWebBluetoothError({ code: "timeout", message: "late" }, "timeout")
    ).toMatchObject({ code: "timeout" })
  })
})
