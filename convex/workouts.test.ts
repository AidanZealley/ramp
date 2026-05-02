import { describe, expect, it } from "vitest"
import {
  createIntervalsConflictErrorData,
  normalizeIntervalsForStorage,
  normalizeWorkoutTitle,
  resolveIntervalsRevision,
  sanitizeWorkoutForClient,
} from "./workouts"
import { validateFtp } from "./settings"

describe("workouts helpers", () => {
  it("defaults legacy missing intervalsRevision to zero", () => {
    expect(resolveIntervalsRevision({ intervalsRevision: undefined })).toBe(0)
  })

  it("sanitizes legacy workouts with intervalsRevision zero", () => {
    const workout = sanitizeWorkoutForClient({
      _id: "workout-1",
      _creationTime: 0,
      title: "Threshold Builder",
      intervals: [{ startPower: 100, endPower: 100, durationSeconds: 60 }],
      summary: { totalDurationSeconds: 60, stressScore: 12 },
      intervalsRevision: undefined,
      powerMode: "percentage",
    } as never)

    expect(workout).toMatchObject({
      title: "Threshold Builder",
      intervalsRevision: 0,
    })
    expect("powerMode" in workout).toBe(false)
  })

  it("builds structured conflict error data", () => {
    expect(createIntervalsConflictErrorData(4)).toEqual({
      kind: "intervalsRevisionConflict",
      currentIntervalsRevision: 4,
    })
  })

  it("normalizes interval comments for storage", () => {
    expect(
      normalizeIntervalsForStorage([
        {
          startPower: 100,
          endPower: 100,
          durationSeconds: 60,
          comment: "  Hold\tsteady\nnow  ",
        },
        {
          startPower: 50,
          endPower: 50,
          durationSeconds: 30,
          comment: "\n\t ",
        },
      ])
    ).toEqual([
      {
        startPower: 100,
        endPower: 100,
        durationSeconds: 60,
        comment: "Hold steady now",
      },
      { startPower: 50, endPower: 50, durationSeconds: 30 },
    ])
  })

  it("accepts 10-second intervals for storage without rewriting them", () => {
    expect(
      normalizeIntervalsForStorage([
        { startPower: 100, endPower: 100, durationSeconds: 10 },
      ])
    ).toEqual([{ startPower: 100, endPower: 100, durationSeconds: 10 }])
  })

  it("rejects invalid workout intervals", () => {
    expect(() =>
      normalizeIntervalsForStorage([
        { startPower: 100, endPower: 100, durationSeconds: 60.5 },
      ])
    ).toThrow("durationSeconds")
    expect(() =>
      normalizeIntervalsForStorage([
        { startPower: 100, endPower: 301, durationSeconds: 60 },
      ])
    ).toThrow("endPower")
  })

  it("rejects invalid FTP values", () => {
    expect(() => validateFtp(49)).toThrow("FTP")
    expect(() => validateFtp(250.5)).toThrow("FTP")
  })

  it("normalizes and validates titles", () => {
    expect(normalizeWorkoutTitle("  Threshold   Builder ")).toBe(
      "Threshold Builder"
    )
    expect(() => normalizeWorkoutTitle("  ")).toThrow(
      "Workout title must not be empty"
    )
  })
})
