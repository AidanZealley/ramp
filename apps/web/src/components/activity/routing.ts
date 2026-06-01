import type { ActivityClientDoc } from "./types"

export function getActivityResumeUrl(activity: ActivityClientDoc) {
  const search: Record<string, string> = { activityId: activity._id }
  if (activity.sourceSnapshot.kind === "workout") {
    search.workoutId = activity.sourceSnapshot.workoutId
  } else if (activity.sourceSnapshot.kind === "route") {
    search.routeId = activity.sourceSnapshot.routeId
  }

  return {
    to: "/ride/$experienceId" as const,
    params: { experienceId: activity.experienceId },
    search,
  }
}
