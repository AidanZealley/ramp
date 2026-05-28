import type { ActivityClientDoc } from "./types"
import { formatRouteDistance, formatRouteElevation } from "@/lib/routes/format"
import { formatDuration } from "@/lib/workout-utils"

export function formatActivityDuration(seconds: number): string {
  return formatDuration(Math.max(0, seconds))
}

export function formatActivityDistance(meters: number): string {
  return formatRouteDistance(Math.max(0, meters))
}

export function formatActivityElevation(
  meters: number | null | undefined
): string {
  return formatRouteElevation(meters ?? null)
}

export function formatActivityDate(timestamp: number | undefined): string {
  if (!timestamp) return "Unknown date"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp))
}

export function getActivitySourceLabel(activity: ActivityClientDoc): string {
  return activity.sourceKind === "workout" ? "Workout" : "Route"
}

export function getActivityPrimaryTimestamp(
  activity: ActivityClientDoc
): number {
  return activity.savedAt ?? activity.endedAt ?? activity.startedAt
}
