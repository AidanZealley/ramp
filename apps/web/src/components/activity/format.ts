import type { ActivityClientDoc } from "./types"
import { formatDuration } from "@/lib/workout-utils"

export function formatActivityDuration(seconds: number): string {
  return formatDuration(Math.max(0, seconds))
}

export function formatActivityDate(timestamp: number | undefined): string {
  if (!timestamp) return "Unknown date"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp))
}

export function getActivitySourceLabel(activity: ActivityClientDoc): string {
  switch (activity.sourceKind) {
    case "workout":
      return "Workout"
    case "ramp-test":
      return "Ramp test"
    default:
      return "Route"
  }
}

export function getActivityPrimaryTimestamp(
  activity: ActivityClientDoc
): number {
  return activity.savedAt ?? activity.endedAt ?? activity.startedAt
}
