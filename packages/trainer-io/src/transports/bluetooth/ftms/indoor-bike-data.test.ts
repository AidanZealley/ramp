import { describe, expect, it } from "vitest"
import { decodeFtmsIndoorBikeData } from "./indoor-bike-data"

describe("decodeFtmsIndoorBikeData", () => {
  it("decodes speed, cadence, power, and heart rate when present", () => {
    const bytes = new Uint8Array([
      0x44, 0x02, 0x6a, 0x08, 0xb4, 0x00, 0xfa, 0x00, 0x96,
    ])

    const result = decodeFtmsIndoorBikeData(new DataView(bytes.buffer))

    expect(result).toEqual({
      speedMps: 5.983333333333333,
      cadenceRpm: 90,
      powerWatts: 250,
      heartRateBpm: 150,
    })
  })

  it("returns null for absent optional telemetry fields", () => {
    const bytes = new Uint8Array([0x01, 0x00])

    const result = decodeFtmsIndoorBikeData(new DataView(bytes.buffer))

    expect(result).toEqual({
      speedMps: null,
      cadenceRpm: null,
      powerWatts: null,
      heartRateBpm: null,
    })
  })
})
