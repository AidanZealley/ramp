import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { workoutToMrc } from "../exporters/mrc"
import { parseMrc } from "./mrc"
import type { Interval } from "../workout-utils"

const FIXTURE_PATH = resolve(__dirname, "../../../examples/workout.mrc")

describe("parseMrc", () => {
  it("parses examples/workout.mrc into the expected 13-interval workout", () => {
    const content = readFileSync(FIXTURE_PATH, "utf-8")
    const result = parseMrc(content)

    expect(result.kind).toBe("ok")
    if (result.kind !== "ok") return

    expect(result.workout.title).toBe("Easy start 45min")
    expect(result.workout.powerMode).toBe("percentage")
    expect(result.workout.intervals).toHaveLength(13)

    const totalSeconds = result.workout.intervals.reduce(
      (sum, i) => sum + i.durationSeconds,
      0
    )
    expect(totalSeconds).toBe(45 * 60)

    // Spot-check the first and last intervals against the fixture.
    expect(result.workout.intervals[0]).toEqual({
      startPower: 50,
      endPower: 70,
      durationSeconds: 5 * 60,
    })
    expect(result.workout.intervals[12]).toEqual({
      startPower: 65,
      endPower: 35,
      durationSeconds: 5 * 60,
    })
  })

  it("round-trips a percentage workout with integer powers exactly", () => {
    const intervals: Array<Interval> = [
      { startPower: 50, endPower: 70, durationSeconds: 300 },
      { startPower: 80, endPower: 80, durationSeconds: 120 },
      { startPower: 95, endPower: 50, durationSeconds: 240 },
    ]
    const mrc = workoutToMrc({
      title: "Round Trip",
      intervals,
    })

    const result = parseMrc(mrc)
    expect(result.kind).toBe("ok")
    if (result.kind !== "ok") return

    expect(result.workout).toEqual({
      title: "Round Trip",
      powerMode: "percentage",
      intervals,
    })
  })

  it("recognizes MINUTES WATTS and preserves raw watts", () => {
    const mrc = [
      "[COURSE HEADER]",
      "VERSION = 2",
      "DESCRIPTION = Watts Workout",
      "MINUTES WATTS",
      "[END COURSE HEADER]",
      "[COURSE DATA]",
      "0.00\t150",
      "1.00\t200",
      "[END COURSE DATA]",
      "",
    ].join("\n")

    const result = parseMrc(mrc)
    expect(result.kind).toBe("ok")
    if (result.kind !== "ok") return

    expect(result.workout.powerMode).toBe("absolute")
    expect(result.workout.intervals).toEqual([
      { startPower: 150, endPower: 200, durationSeconds: 60 },
    ])
  })

  it("rejects MINUTES MPH (not a power format)", () => {
    const mrc = [
      "[COURSE HEADER]",
      "DESCRIPTION = Run",
      "MINUTES MPH",
      "[END COURSE HEADER]",
      "[COURSE DATA]",
      "0.00\t6",
      "1.00\t6",
      "[END COURSE DATA]",
    ].join("\n")
    const result = parseMrc(mrc)
    expect(result.kind).toBe("error")
    if (result.kind !== "error") return
    expect(result.reason).toBe("no-units")
  })

  it("returns missing-header when [COURSE HEADER] is absent", () => {
    const mrc = [
      "[COURSE DATA]",
      "0.00\t50",
      "1.00\t60",
      "[END COURSE DATA]",
    ].join("\n")
    const result = parseMrc(mrc)
    expect(result.kind).toBe("error")
    if (result.kind !== "error") return
    expect(result.reason).toBe("missing-header")
  })

  it("returns missing-data when [COURSE DATA] is absent", () => {
    const mrc = [
      "[COURSE HEADER]",
      "DESCRIPTION = NoData",
      "MINUTES PERCENT",
      "[END COURSE HEADER]",
    ].join("\n")
    const result = parseMrc(mrc)
    expect(result.kind).toBe("error")
    if (result.kind !== "error") return
    expect(result.reason).toBe("missing-data")
  })

  it("returns odd-row-count when the data block has an odd number of rows", () => {
    const mrc = [
      "[COURSE HEADER]",
      "DESCRIPTION = Odd",
      "MINUTES PERCENT",
      "[END COURSE HEADER]",
      "[COURSE DATA]",
      "0.00\t50",
      "1.00\t60",
      "1.00\t70",
      "[END COURSE DATA]",
    ].join("\n")
    const result = parseMrc(mrc)
    expect(result.kind).toBe("error")
    if (result.kind !== "error") return
    expect(result.reason).toBe("odd-row-count")
  })

  it("returns no-intervals when every pair is zero-duration", () => {
    const mrc = [
      "[COURSE HEADER]",
      "DESCRIPTION = Empty",
      "MINUTES PERCENT",
      "[END COURSE HEADER]",
      "[COURSE DATA]",
      "0.00\t50",
      "0.00\t60",
      "[END COURSE DATA]",
    ].join("\n")
    const result = parseMrc(mrc)
    expect(result.kind).toBe("error")
    if (result.kind !== "error") return
    expect(result.reason).toBe("no-intervals")
  })

  it("tolerates CRLF line endings", () => {
    const mrc =
      "[COURSE HEADER]\r\n" +
      "DESCRIPTION = CRLF\r\n" +
      "MINUTES PERCENT\r\n" +
      "[END COURSE HEADER]\r\n" +
      "[COURSE DATA]\r\n" +
      "0.00\t50\r\n" +
      "1.00\t60\r\n" +
      "[END COURSE DATA]\r\n"
    const result = parseMrc(mrc)
    expect(result.kind).toBe("ok")
    if (result.kind !== "ok") return
    expect(result.workout.title).toBe("CRLF")
    expect(result.workout.intervals).toHaveLength(1)
  })

  it("tolerates extra whitespace in headers and data rows", () => {
    const mrc = [
      "[COURSE HEADER]",
      "DESCRIPTION   =   Spacious Title",
      "MINUTES PERCENT",
      "[END COURSE HEADER]",
      "[COURSE DATA]",
      "0.00    50",
      "2.00    75",
      "[END COURSE DATA]",
    ].join("\n")
    const result = parseMrc(mrc)
    expect(result.kind).toBe("ok")
    if (result.kind !== "ok") return
    expect(result.workout.title).toBe("Spacious Title")
    expect(result.workout.intervals).toEqual([
      { startPower: 50, endPower: 75, durationSeconds: 120 },
    ])
  })

  it("walks pairs (not a sliding window): 2 rows → 1 interval, 4 rows → 2 intervals", () => {
    const baseHeader = [
      "[COURSE HEADER]",
      "DESCRIPTION = Pairs",
      "MINUTES PERCENT",
      "[END COURSE HEADER]",
      "[COURSE DATA]",
    ]

    const twoRow = [
      ...baseHeader,
      "0.00\t50",
      "1.00\t60",
      "[END COURSE DATA]",
    ].join("\n")
    const r1 = parseMrc(twoRow)
    expect(r1.kind).toBe("ok")
    if (r1.kind === "ok") {
      expect(r1.workout.intervals).toHaveLength(1)
    }

    const fourRow = [
      ...baseHeader,
      "0.00\t50",
      "1.00\t60",
      "1.00\t70",
      "3.00\t70",
      "[END COURSE DATA]",
    ].join("\n")
    const r2 = parseMrc(fourRow)
    expect(r2.kind).toBe("ok")
    if (r2.kind === "ok") {
      expect(r2.workout.intervals).toEqual([
        { startPower: 50, endPower: 60, durationSeconds: 60 },
        { startPower: 70, endPower: 70, durationSeconds: 120 },
      ])
    }
  })
})
