import type { FunctionReturnType } from "convex/server"
import type { Id } from "#convex/_generated/dataModel"
import type { api } from "#convex/_generated/api"

export type ActivityClientDoc = NonNullable<
  FunctionReturnType<typeof api.activities.get>
>

export type ActivitySummaryInput = ActivityClientDoc["summary"]
export type ActivityResumeStateInput = ActivityClientDoc["resumeState"]

export type ActivityStartResult =
  | { ok: true; activity: ActivityClientDoc }
  | {
      ok: false
      reason: "unresolvedActivityExists"
      activity: ActivityClientDoc | null
    }

export type ActivityExperienceAPI = {
  unresolvedActivity: ActivityClientDoc | null
  resumeActivity: ActivityClientDoc | null
  startWorkoutActivity: (args: {
    workoutId: Id<"workouts">
    ftpAtStart: number
  }) => Promise<ActivityStartResult>
  startRouteActivity: (args: {
    routeId: Id<"routes">
  }) => Promise<ActivityStartResult>
  startRampTestActivity: (args: {
    builtInId: string
    ftpAtStart: number
  }) => Promise<ActivityStartResult>
  saveProgress: (args: {
    summary: ActivitySummaryInput
    resumeState: ActivityResumeStateInput
  }) => Promise<void>
  markPending: (args: {
    summary: ActivitySummaryInput
    resumeState: ActivityResumeStateInput
  }) => Promise<void>
  complete: (args: {
    title: string
    summary?: ActivitySummaryInput
    resumeState?: ActivityResumeStateInput
    resultFtp?: number | null
  }) => Promise<void>
  discard: () => Promise<void>
  getResumeUrl: (activity: ActivityClientDoc) => {
    to: "/ride/$experienceId"
    params: { experienceId: string }
    search: Record<string, string>
  }
}
