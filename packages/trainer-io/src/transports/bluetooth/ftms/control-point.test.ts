import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  decodeControlPointResponse,
  encodeReset,
  encodeSetResistance,
  encodeSetSimulationGrade,
  encodeSetTargetPower,
  FtmsControlPointClient,
} from "./control-point"

describe("FTMS control point encoding", () => {
  it("encodes target power", () => {
    expect(Array.from(encodeSetTargetPower(250))).toEqual([0x05, 0xfa, 0x00])
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
    vi.useRealTimers()
  })

  it("maps missing responses to timeout", async () => {
    const client = new FtmsControlPointClient(
      {
        uuid: "control",
        startNotifications: vi.fn(async () => undefined),
        stopNotifications: vi.fn(async () => undefined),
        writeValue: vi.fn(async () => undefined),
        subscribe(listener: (value: DataView) => void) {
          void listener
          return () => {
            return undefined
          }
        },
      } as never,
      1000
    )

    await client.start()
    const outcome = client.requestControl().catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(1000)

    await expect(outcome).resolves.toMatchObject({ code: "timeout" })
  })
})
