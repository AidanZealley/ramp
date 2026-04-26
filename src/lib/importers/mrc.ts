import type { Interval } from "../workout-utils"

/**
 * Parse the `.mrc` (MINUTES PERCENT) format consumed by indoor trainer apps
 * such as TrainerRoad, Zwift, Wahoo, etc. — the inverse of `workoutToMrc`
 * in `../exporters/mrc.ts`.
 *
 * MRC is %FTP-only by spec in practice. A workout originally created in
 * `absolute` mode and round-tripped through the exporter will come back as
 * `powerMode: "percentage"` because the exporter normalizes watts → %FTP and
 * quantizes to integers (so expect ∓1% drift on round-trip).
 *
 * The parser returns a discriminated union rather than throwing so the UI
 * layer can branch on success/error without try/catch.
 */
export type MrcParseErrorReason =
  | "missing-header"
  | "missing-data"
  | "no-units"
  | "odd-row-count"
  | "malformed-row"
  | "no-intervals"

export type MrcParseResult =
  | {
      kind: "ok"
      workout: {
        title: string
        powerMode: "absolute" | "percentage"
        intervals: Array<Interval>
      }
    }
  | { kind: "error"; reason: MrcParseErrorReason; message: string }

const HEADER_OPEN = "[COURSE HEADER]"
const HEADER_CLOSE = "[END COURSE HEADER]"
const DATA_OPEN = "[COURSE DATA]"
const DATA_CLOSE = "[END COURSE DATA]"

export function parseMrc(content: string): MrcParseResult {
  const lines = content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())

  const headerStart = lines.indexOf(HEADER_OPEN)
  const headerEnd = lines.indexOf(HEADER_CLOSE)
  if (headerStart === -1 || headerEnd === -1 || headerEnd < headerStart) {
    return {
      kind: "error",
      reason: "missing-header",
      message: `Missing or malformed ${HEADER_OPEN} block.`,
    }
  }

  const headerLines = lines.slice(headerStart + 1, headerEnd)
  let title = ""
  let powerMode: "absolute" | "percentage" | null = null

  for (const line of headerLines) {
    if (!line) continue

    // Units line is bare (no `=`): MINUTES PERCENT | MINUTES WATTS | MINUTES MPH | …
    const upper = line.toUpperCase()
    if (upper.startsWith("MINUTES")) {
      if (upper === "MINUTES PERCENT") powerMode = "percentage"
      else if (upper === "MINUTES WATTS") powerMode = "absolute"
      // any other MINUTES variant (e.g. MINUTES MPH) is rejected below
      continue
    }

    // Key/value lines: "KEY = VALUE" with arbitrary whitespace around `=`.
    const eq = line.indexOf("=")
    if (eq === -1) continue
    const key = line.slice(0, eq).trim().toUpperCase()
    const value = line.slice(eq + 1).trim()
    if (key === "DESCRIPTION") {
      title = value
    }
  }

  if (powerMode === null) {
    return {
      kind: "error",
      reason: "no-units",
      message:
        "Header is missing a recognized units line (expected MINUTES PERCENT or MINUTES WATTS).",
    }
  }

  const dataStart = lines.indexOf(DATA_OPEN)
  const dataEnd = lines.indexOf(DATA_CLOSE)
  if (dataStart === -1 || dataEnd === -1 || dataEnd < dataStart) {
    return {
      kind: "error",
      reason: "missing-data",
      message: `Missing or malformed ${DATA_OPEN} block.`,
    }
  }

  const rawDataLines = lines
    .slice(dataStart + 1, dataEnd)
    .filter((line) => line.length > 0)

  type Row = { minutes: number; power: number }
  const rows: Array<Row> = []
  for (const line of rawDataLines) {
    const tokens = line.split(/\s+/).filter((t) => t.length > 0)
    if (tokens.length !== 2) {
      return {
        kind: "error",
        reason: "malformed-row",
        message: `Data row "${line}" must have exactly two whitespace-separated values.`,
      }
    }
    const minutes = Number(tokens[0])
    const power = Number(tokens[1])
    if (
      !Number.isFinite(minutes) ||
      !Number.isFinite(power) ||
      minutes < 0 ||
      power < 0
    ) {
      return {
        kind: "error",
        reason: "malformed-row",
        message: `Data row "${line}" contains non-numeric or negative values.`,
      }
    }
    rows.push({ minutes, power })
  }

  if (rows.length % 2 !== 0) {
    return {
      kind: "error",
      reason: "odd-row-count",
      message: `Data block has ${rows.length} rows; .mrc requires pairs (start + end per interval).`,
    }
  }

  const intervals: Array<Interval> = []
  for (let i = 0; i < rows.length; i += 2) {
    const start = rows[i]
    const end = rows[i + 1]
    const durationSeconds = Math.round((end.minutes - start.minutes) * 60)
    if (durationSeconds < 0) {
      return {
        kind: "error",
        reason: "malformed-row",
        message: `Interval ending at ${end.minutes}min comes before its start at ${start.minutes}min.`,
      }
    }
    // Same-minute pairs are degenerate (the editor would render them as a 1px
    // sliver and they'd be unselectable). Real seam-markers in correctly-formed
    // .mrc files appear *between* consecutive pairs, not within a pair.
    if (durationSeconds === 0) continue
    intervals.push({
      startPower: start.power,
      endPower: end.power,
      durationSeconds,
    })
  }

  if (intervals.length === 0) {
    return {
      kind: "error",
      reason: "no-intervals",
      message: "Data block did not contain any intervals.",
    }
  }

  return {
    kind: "ok",
    workout: { title, powerMode, intervals },
  }
}
