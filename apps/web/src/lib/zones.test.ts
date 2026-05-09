import { describe, expect, it } from "vitest"
import { getZone, getZoneGradient, getZoneInfoByZone } from "./zones"

describe("getZone", () => {
  it("maps Zwift FTP percentages to the correct zones", () => {
    expect(getZone(0)).toBe(1)
    expect(getZone(59)).toBe(1)

    expect(getZone(60)).toBe(2)
    expect(getZone(75)).toBe(2)

    expect(getZone(76)).toBe(3)
    expect(getZone(89)).toBe(3)

    expect(getZone(90)).toBe(4)
    expect(getZone(104)).toBe(4)

    expect(getZone(105)).toBe(5)
    expect(getZone(118)).toBe(5)

    expect(getZone(119)).toBe(6)
    expect(getZone(150)).toBe(6)
  })
})

describe("getZoneInfoByZone", () => {
  it("exposes the six Zwift zone labels", () => {
    expect(getZoneInfoByZone(1).name).toBe("Recovery")
    expect(getZoneInfoByZone(2).name).toBe("Endurance")
    expect(getZoneInfoByZone(3).name).toBe("Tempo")
    expect(getZoneInfoByZone(4).name).toBe("Threshold")
    expect(getZoneInfoByZone(5).name).toBe("VO2 Max")
    expect(getZoneInfoByZone(6).name).toBe("Anaerobic")
  })
})

describe("getZoneGradient", () => {
  it("includes each crossed zone colour for ascending ramps", () => {
    expect(getZoneGradient(50, 130)).toBe(
      [
        "linear-gradient(to right",
        " oklch(0.65 0.01 260) 0.00%",
        " oklch(0.65 0.18 250) 12.50%",
        " oklch(0.72 0.18 145) 32.50%",
        " oklch(0.84 0.17 95) 50.00%",
        " oklch(0.73 0.19 55) 68.75%",
        " oklch(0.63 0.22 25) 86.25%",
        " oklch(0.63 0.22 25) 100.00%)",
      ].join(","),
    )
  })

  it("includes each crossed zone colour for descending ramps", () => {
    expect(getZoneGradient(130, 50)).toContain(
      "oklch(0.65 0.18 250) 68.75%",
    )
  })
})
