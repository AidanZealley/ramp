import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GattCharacteristic as WebBluetoothGattCharacteristic } from "../web-bluetooth/gatt-characteristic"
import {
  FtmsControlPointClient,
  decodeControlPointResponse,
  encodeReset,
  encodeSetResistance,
  encodeSetSimulationGrade,
  encodeSetTargetPower,
} from "./control-point"
import type { GattCharacteristic } from "../web-bluetooth/gatt-characteristic"

function createGattCharacteristicHarness(options?: {
  writeValue?: (value: BufferSource) => Promise<void>
}): {
  characteristic: GattCharacteristic
  emit: (value: DataView) => void
  writes: Array<Uint8Array>
  stopNotifications: ReturnType<typeof vi.fn>
} {
  let listener: ((value: DataView) => void) | null = null
  const writes: Array<Uint8Array> = []
  const stopNotifications = vi.fn(() => Promise.resolve(undefined))
  const bluetoothCharacteristic = {
    uuid: "control",
    value: null as DataView | null,
    readValue: vi.fn(() => Promise.resolve(new DataView(new ArrayBuffer(0)))),
    writeValue: vi.fn((value: BufferSource) => {
      writes.push(new Uint8Array(ArrayBuffer.isView(value) ? value.buffer : value))
      return options?.writeValue?.(value) ?? Promise.resolve(undefined)
    }),
    writeValueWithResponse: undefined,
    startNotifications: vi.fn(() => Promise.resolve(undefined)),
    stopNotifications,
    addEventListener: vi.fn(
      (_event: string, next: EventListenerOrEventListenerObject) => {
        listener = () => {
          if (typeof next === "function") {
            next({ target: bluetoothCharacteristic } as unknown as Event)
          } else {
            next.handleEvent({
              target: bluetoothCharacteristic,
            } as unknown as Event)
          }
        }
      }
    ),
    removeEventListener: vi.fn(() => {
      listener = null
    }),
  }
  return {
    writes,
    stopNotifications,
    emit(value) {
      bluetoothCharacteristic.value = value
      listener?.(value)
    },
    characteristic: new WebBluetoothGattCharacteristic(
      bluetoothCharacteristic as unknown as BluetoothRemoteGATTCharacteristic
    ),
  }
}

describe("FTMS control point encoding", () => {
  it("encodes target power", () => {
    expect(Array.from(encodeSetTargetPower(250))).toEqual([0x05, 0xfa, 0x00])
    expect(Array.from(encodeSetTargetPower(199.6))).toEqual([0x05, 0xc8, 0x00])
    expect(Array.from(encodeSetTargetPower(-1))).toEqual([0x05, 0x00, 0x00])
    expect(Array.from(encodeSetTargetPower(70_000))).toEqual([
      0x05, 0xff, 0xff,
    ])
  })

  it("encodes reset", () => {
    expect(Array.from(encodeReset())).toEqual([0x01])
  })

  it("encodes resistance in 0.1 increments", () => {
    expect(Array.from(encodeSetResistance(37))).toEqual([0x04, 0x72, 0x01])
  })

  it("encodes simulation parameters", () => {
    expect(
      Array.from(
        encodeSetSimulationGrade({ gradePercent: 3.5, windSpeedMps: 2.25 })
      )
    ).toEqual([0x11, 0xca, 0x08, 0x5e, 0x01, 0x28, 0x33])
    expect(
      Array.from(
        encodeSetSimulationGrade({ gradePercent: -1.25, windSpeedMps: -2.5 })
      )
    ).toEqual([0x11, 0x3c, 0xf6, 0x83, 0xff, 0x28, 0x33])
  })

  it("decodes control point responses", () => {
    const bytes = new Uint8Array([0x80, 0x05, 0x01])

    expect(
      decodeControlPointResponse(new DataView(bytes.buffer))
    ).toMatchObject({
      requestCode: 0x05,
      resultCode: 0x01,
      ok: true,
    })
  })
})

describe("FtmsControlPointClient", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("maps missing responses to timeout", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined)
    const harness = createGattCharacteristicHarness()
    const client = new FtmsControlPointClient(harness.characteristic, 1000)

    await client.start()
    const outcome = client.requestControl().catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(1000)

    await expect(outcome).resolves.toMatchObject({ code: "timeout" })
  })

  it("resolves when the response arrives immediately after write initiation", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined)
    const harness = createGattCharacteristicHarness({
      writeValue: () => {
        harness.emit(new DataView(Uint8Array.of(0x80, 0x00, 0x01).buffer))
        return Promise.resolve()
      },
    })
    const client = new FtmsControlPointClient(harness.characteristic, 1000)

    await client.start()

    await expect(client.requestControl()).resolves.toBeUndefined()
  })

  it("clears pending state when the write fails so the next command can proceed", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined)
    const writeValue = vi
      .fn()
      .mockRejectedValueOnce(new Error("write failed"))
      .mockImplementationOnce(() => {
        harness.emit(new DataView(Uint8Array.of(0x80, 0x00, 0x01).buffer))
        return Promise.resolve(undefined)
      })
    const harness = createGattCharacteristicHarness({ writeValue })
    const client = new FtmsControlPointClient(harness.characteristic, 1000)

    await client.start()

    await expect(client.requestControl()).rejects.toMatchObject({
      code: "transport",
    })
    await expect(client.requestControl()).resolves.toBeUndefined()
  })

  it("rejects rejected control responses and ignores out-of-order responses", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined)
    const harness = createGattCharacteristicHarness()
    const client = new FtmsControlPointClient(harness.characteristic, 1000)

    await client.start()
    const request = client.requestControl()
    await Promise.resolve()
    harness.emit(new DataView(Uint8Array.of(0x80, 0x05, 0x01).buffer))
    harness.emit(new DataView(Uint8Array.of(0x80, 0x00, 0x04).buffer))

    await expect(request).rejects.toMatchObject({ code: "command-rejected" })
  })

  it("stop rejects pending commands and unsubscribes", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined)
    const harness = createGattCharacteristicHarness()
    const client = new FtmsControlPointClient(harness.characteristic, 1000)

    await client.start()
    const request = client.requestControl()
    await Promise.resolve()
    await client.stop()
    harness.emit(new DataView(Uint8Array.of(0x80, 0x00, 0x01).buffer))

    await expect(request).rejects.toMatchObject({ code: "transport" })
    expect(harness.stopNotifications).toHaveBeenCalled()
  })
})
