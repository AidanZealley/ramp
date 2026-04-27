import { describe, expect, it } from "vitest"
import { workoutToMrc } from "./mrc"
import type { Interval } from "../workout-utils"

describe("workoutToMrc", () => {
  it("emits the exact header block the spec requires", () => {
    const mrc = workoutToMrc({
      title: "Easy start 45min",
      intervals: [{ startPower: 50, endPower: 70, durationSeconds: 300 }],
    })

    const lines = mrc.split("\n")
    expect(lines.slice(0, 7)).toEqual([
      "[COURSE HEADER]",
      "VERSION = 2",
      "UNITS = ENGLISH",
      "DESCRIPTION = Easy start 45min",
      "FILE NAME = Easy start 45min",
      "MINUTES PERCENT",
      "[END COURSE HEADER]",
    ])
  })

  it("produces 4 data rows with cumulative times for a two-interval percentage workout", () => {
    const intervals: Array<Interval> = [
      { startPower: 50, endPower: 70, durationSeconds: 300 }, // 0–5 min
      { startPower: 80, endPower: 80, durationSeconds: 120 }, // 5–7 min
    ]

    const mrc = workoutToMrc({
      title: "Test",
      intervals,
    })

    const dataRows = extractDataRows(mrc)
    expect(dataRows).toEqual(["0.00\t50", "5.00\t70", "5.00\t80", "7.00\t80"])
  })

  it("serializes canonical percentage intervals without conversion", () => {
    const mrc = workoutToMrc({
      title: "Percent",
      intervals: [
        { startPower: 50, endPower: 100, durationSeconds: 60 },
        { startPower: 75, endPower: 75, durationSeconds: 60 },
      ],
    })

    const dataRows = extractDataRows(mrc)
    expect(dataRows).toEqual(["0.00\t50", "1.00\t100", "1.00\t75", "2.00\t75"])
  })

  it("matches the structural shape of examples/workout.mrc", () => {
    // Reconstruct the seeded "Easy start 45min" workout as intervals
    // (start power, end power, duration in seconds).
    const intervals: Array<Interval> = [
      { startPower: 50, endPower: 70, durationSeconds: 5 * 60 },
      { startPower: 80, endPower: 80, durationSeconds: 2 * 60 },
      { startPower: 40, endPower: 40, durationSeconds: 1 * 60 },
      { startPower: 85, endPower: 85, durationSeconds: 4 * 60 },
      { startPower: 40, endPower: 40, durationSeconds: 2 * 60 },
      { startPower: 90, endPower: 90, durationSeconds: 6 * 60 },
      { startPower: 40, endPower: 40, durationSeconds: 3 * 60 },
      { startPower: 90, endPower: 90, durationSeconds: 6 * 60 },
      { startPower: 40, endPower: 40, durationSeconds: 3 * 60 },
      { startPower: 95, endPower: 95, durationSeconds: 4 * 60 },
      { startPower: 40, endPower: 40, durationSeconds: 2 * 60 },
      { startPower: 100, endPower: 100, durationSeconds: 2 * 60 },
      { startPower: 65, endPower: 35, durationSeconds: 5 * 60 },
    ]

    const mrc = workoutToMrc({
      title: "Easy start 45min",
      intervals,
    })

    expect(mrc.startsWith("[COURSE HEADER]\n")).toBe(true)
    expect(mrc.endsWith("[END COURSE DATA]\n")).toBe(true)
    expect(mrc).toContain("[COURSE DATA]\n")
    expect(mrc).toContain("[END COURSE HEADER]\n")

    const dataRows = extractDataRows(mrc)
    // Two rows per interval.
    expect(dataRows).toHaveLength(intervals.length * 2)

    // Every data row is "<minutes>.dd\t<int %FTP>" — no fractional percents.
    for (const row of dataRows) {
      expect(row).toMatch(/^\d+\.\d{2}\t-?\d+$/)
    }

    // Final cumulative time should be the workout total in minutes.
    const totalMinutes =
      intervals.reduce((s, i) => s + i.durationSeconds, 0) / 60
    const lastRow = dataRows[dataRows.length - 1]
    expect(lastRow.split("\t")[0]).toBe(totalMinutes.toFixed(2))
  })

  it("ends with a single trailing newline", () => {
    const mrc = workoutToMrc({
      title: "Trail",
      intervals: [{ startPower: 50, endPower: 50, durationSeconds: 60 }],
    })
    expect(mrc.endsWith("\n")).toBe(true)
    expect(mrc.endsWith("\n\n")).toBe(false)
  })

  it("sanitizes illegal filename characters but leaves the description untouched", () => {
    const mrc = workoutToMrc({
      title: 'Sweet/Spot: "VO2"?',
      intervals: [{ startPower: 50, endPower: 50, durationSeconds: 60 }],
    })
    expect(mrc).toContain('DESCRIPTION = Sweet/Spot: "VO2"?')
    expect(mrc).toContain("FILE NAME = SweetSpot VO2")
  })
})

function extractDataRows(mrc: string): Array<string> {
  const lines = mrc.split("\n")
  const start = lines.indexOf("[COURSE DATA]")
  const end = lines.indexOf("[END COURSE DATA]")
  return lines.slice(start + 1, end)
}
