import { describe, expect, it } from "vitest"
import { workoutToMrc } from "./mrc"
import type { Interval } from "../workout-utils"

describe("workoutToMrc", () => {
  it("emits the exact header block the spec requires", () => {
    const mrc = workoutToMrc({
      title: "Easy start 45min",
      powerMode: "percentage",
      intervals: [{ startPower: 50, endPower: 70, durationSeconds: 300 }],
      ftp: 200,
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
      powerMode: "percentage",
      intervals,
      ftp: 200,
    })

    const dataRows = extractDataRows(mrc)
    expect(dataRows).toEqual(["0.00\t50", "5.00\t70", "5.00\t80", "7.00\t80"])
  })

  it("converts absolute watts to %FTP using the supplied FTP", () => {
    // 200W at FTP 200 → 100%; 100W at FTP 200 → 50%; 150W → 75%
    const mrc = workoutToMrc({
      title: "Watts",
      powerMode: "absolute",
      intervals: [
        { startPower: 100, endPower: 200, durationSeconds: 60 },
        { startPower: 150, endPower: 150, durationSeconds: 60 },
      ],
      ftp: 200,
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
      powerMode: "percentage",
      intervals,
      ftp: 200,
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
      powerMode: "percentage",
      intervals: [{ startPower: 50, endPower: 50, durationSeconds: 60 }],
      ftp: 200,
    })
    expect(mrc.endsWith("\n")).toBe(true)
    expect(mrc.endsWith("\n\n")).toBe(false)
  })

  it("sanitizes illegal filename characters but leaves the description untouched", () => {
    const mrc = workoutToMrc({
      title: 'Sweet/Spot: "VO2"?',
      powerMode: "percentage",
      intervals: [{ startPower: 50, endPower: 50, durationSeconds: 60 }],
      ftp: 200,
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
