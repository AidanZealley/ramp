import type { Interval } from "../workout-utils"

export interface MrcExportInput {
  title: string
  powerMode: "absolute" | "percentage"
  intervals: Interval[]
  ftp: number
}

/**
 * Sanitize a string for use as the `FILE NAME` field in an .mrc header.
 * Strips characters that are illegal in common filesystem filenames and
 * collapses runs of whitespace to a single space.
 */
function sanitizeFileName(name: string): string {
  // eslint-disable-next-line no-control-regex
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Serialize a workout to the `.mrc` (MINUTES PERCENT) format consumed by
 * indoor trainer apps such as TrainerRoad, Zwift, Wahoo, etc.
 *
 * The format is always %FTP — when `powerMode === "absolute"` the watts
 * are converted using the supplied FTP via `Math.round((watts / ftp) * 100)`.
 */
export function workoutToMrc(input: MrcExportInput): string {
  const { title, powerMode, intervals, ftp } = input

  const pct = (p: number): number => {
    if (powerMode === "percentage") return Math.round(p)
    return Math.round((p / ftp) * 100)
  }

  const lines: Array<string> = [
    "[COURSE HEADER]",
    "VERSION = 2",
    "UNITS = ENGLISH",
    `DESCRIPTION = ${title}`,
    `FILE NAME = ${sanitizeFileName(title)}`,
    "MINUTES PERCENT",
    "[END COURSE HEADER]",
    "[COURSE DATA]",
  ]

  let elapsed = 0
  for (const interval of intervals) {
    const startMinutes = (elapsed / 60).toFixed(2)
    const endMinutes = ((elapsed + interval.durationSeconds) / 60).toFixed(2)
    lines.push(`${startMinutes}\t${pct(interval.startPower)}`)
    lines.push(`${endMinutes}\t${pct(interval.endPower)}`)
    elapsed += interval.durationSeconds
  }

  lines.push("[END COURSE DATA]")
  return lines.join("\n") + "\n"
}
