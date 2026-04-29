import type { Interval } from "../workout-utils"

export interface MrcExportInput {
  title: string
  intervals: Array<Interval>
}

/**
 * Sanitize a string for use as the `FILE NAME` field in an .mrc header.
 * Strips characters that are illegal in common filesystem filenames and
 * collapses runs of whitespace to a single space.
 */
function sanitizeFileName(name: string): string {
  return name
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0)
      return !/[<>:"/\\|?*]/.test(char) && (code < 0 || code > 31)
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Serialize a workout to the `.mrc` (MINUTES PERCENT) format consumed by
 * indoor trainer apps such as TrainerRoad, Zwift, Wahoo, etc.
 *
 * The format is always canonical %FTP.
 */
export function workoutToMrc(input: MrcExportInput): string {
  const { title, intervals } = input

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
    lines.push(`${startMinutes}\t${Math.round(interval.startPower)}`)
    lines.push(`${endMinutes}\t${Math.round(interval.endPower)}`)
    elapsed += interval.durationSeconds
  }

  lines.push("[END COURSE DATA]")
  return lines.join("\n") + "\n"
}
