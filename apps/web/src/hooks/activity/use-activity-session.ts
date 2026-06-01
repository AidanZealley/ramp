import { useCallback, useMemo, useState } from "react"
import { useConvex, useMutation, useQuery } from "convex/react"
import type {
  ActivityClientDoc,
  ActivityExperienceAPI,
  ActivityResumeStateInput,
  ActivityStartResult,
  ActivitySummaryInput,
} from "@/components/activity/types"
import type { Id } from "#convex/_generated/dataModel"
import { api } from "#convex/_generated/api"
import { getActivityResumeUrl } from "@/components/activity/routing"

type UseActivitySessionArgs = {
  activityId?: Id<"activities">
}

type UnresolvedActivityError = Error & {
  data?: {
    kind?: string
    activityId?: Id<"activities">
  }
}

function isUnresolvedActivityError(
  error: unknown
): error is UnresolvedActivityError {
  return (
    error instanceof Error &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "kind" in error.data &&
    error.data.kind === "unresolvedActivityExists"
  )
}

export function useActivitySession({
  activityId,
}: UseActivitySessionArgs): ActivityExperienceAPI {
  const convex = useConvex()
  const unresolvedActivity = useQuery(api.activities.getUnresolved)
  const queriedResumeActivity = useQuery(
    api.activities.get,
    activityId ? { activityId } : "skip"
  )
  const startActivity = useMutation(api.activities.start)
  const saveProgressMutation = useMutation(api.activities.saveProgress)
  const markPendingMutation = useMutation(api.activities.markPending)
  const completeMutation = useMutation(api.activities.complete)
  const discardMutation = useMutation(api.activities.discard)
  const [localActivity, setLocalActivity] = useState<ActivityClientDoc | null>(
    null
  )

  const resumeActivity = queriedResumeActivity ?? localActivity
  const activeActivity = resumeActivity ?? localActivity

  const resolveBlockedActivity = useCallback(
    async (error: UnresolvedActivityError) => {
      const blockedActivityId = error.data?.activityId
      if (!blockedActivityId) {
        return unresolvedActivity ?? null
      }
      return await convex.query(api.activities.get, {
        activityId: blockedActivityId,
      })
    },
    [convex, unresolvedActivity]
  )

  const startWorkoutActivity = useCallback(
    async ({
      workoutId,
      ftpAtStart,
    }: {
      workoutId: Id<"workouts">
      ftpAtStart: number
    }): Promise<ActivityStartResult> => {
      try {
        const activity = await startActivity({
          activity: {
            sourceKind: "workout",
            workoutId,
            experienceId: "live-workout",
            ftpAtStart,
          },
        })
        setLocalActivity(activity)
        return { ok: true, activity }
      } catch (error) {
        if (isUnresolvedActivityError(error)) {
          return {
            ok: false,
            reason: "unresolvedActivityExists",
            activity: await resolveBlockedActivity(error),
          }
        }
        throw error
      }
    },
    [resolveBlockedActivity, startActivity]
  )

  const startRouteActivity = useCallback(
    async ({
      routeId,
    }: {
      routeId: Id<"routes">
    }): Promise<ActivityStartResult> => {
      try {
        const activity = await startActivity({
          activity: {
            sourceKind: "route",
            routeId,
            experienceId: "route",
          },
        })
        setLocalActivity(activity)
        return { ok: true, activity }
      } catch (error) {
        if (isUnresolvedActivityError(error)) {
          return {
            ok: false,
            reason: "unresolvedActivityExists",
            activity: await resolveBlockedActivity(error),
          }
        }
        throw error
      }
    },
    [resolveBlockedActivity, startActivity]
  )

  const startRampTestActivity = useCallback(
    async ({
      builtInId,
      ftpAtStart,
    }: {
      builtInId: string
      ftpAtStart: number
    }): Promise<ActivityStartResult> => {
      try {
        const activity = await startActivity({
          activity: {
            sourceKind: "ramp-test",
            builtInId,
            experienceId: "ramp-test",
            ftpAtStart,
          },
        })
        setLocalActivity(activity)
        return { ok: true, activity }
      } catch (error) {
        if (isUnresolvedActivityError(error)) {
          return {
            ok: false,
            reason: "unresolvedActivityExists",
            activity: await resolveBlockedActivity(error),
          }
        }
        throw error
      }
    },
    [resolveBlockedActivity, startActivity]
  )

  const requireActiveActivityId = useCallback(() => {
    if (!activeActivity) {
      throw new Error("No active activity")
    }
    return activeActivity._id
  }, [activeActivity])

  const saveProgress = useCallback(
    async ({
      summary,
      resumeState,
    }: {
      summary: ActivitySummaryInput
      resumeState: ActivityResumeStateInput
    }) => {
      const currentActivityId = requireActiveActivityId()
      await saveProgressMutation({
        activityId: currentActivityId,
        summary,
        resumeState,
      })
      setLocalActivity((current) =>
        current?._id === currentActivityId
          ? { ...current, status: "in_progress", summary, resumeState }
          : current
      )
    },
    [requireActiveActivityId, saveProgressMutation]
  )

  const markPending = useCallback(
    async ({
      summary,
      resumeState,
    }: {
      summary: ActivitySummaryInput
      resumeState: ActivityResumeStateInput
    }) => {
      const currentActivityId = requireActiveActivityId()
      await markPendingMutation({
        activityId: currentActivityId,
        summary,
        resumeState,
      })
      setLocalActivity((current) =>
        current?._id === currentActivityId
          ? { ...current, status: "pending", summary, resumeState }
          : current
      )
    },
    [markPendingMutation, requireActiveActivityId]
  )

  const complete = useCallback(
    async ({
      title,
      summary,
      resumeState,
      resultFtp,
    }: {
      title: string
      summary?: ActivitySummaryInput
      resumeState?: ActivityResumeStateInput
      resultFtp?: number | null
    }) => {
      const currentActivityId = requireActiveActivityId()
      await completeMutation({
        activityId: currentActivityId,
        title,
        summary,
        resumeState,
        resultFtp,
      })
      setLocalActivity(null)
    },
    [completeMutation, requireActiveActivityId]
  )

  const discard = useCallback(async () => {
    const currentActivityId = requireActiveActivityId()
    await discardMutation({ activityId: currentActivityId })
    setLocalActivity(null)
  }, [discardMutation, requireActiveActivityId])

  const getResumeUrl = useCallback(getActivityResumeUrl, [])

  return useMemo(
    () => ({
      unresolvedActivity: unresolvedActivity ?? null,
      resumeActivity,
      startWorkoutActivity,
      startRouteActivity,
      startRampTestActivity,
      saveProgress,
      markPending,
      complete,
      discard,
      getResumeUrl,
    }),
    [
      complete,
      discard,
      getResumeUrl,
      markPending,
      resumeActivity,
      saveProgress,
      startRampTestActivity,
      startRouteActivity,
      startWorkoutActivity,
      unresolvedActivity,
    ]
  )
}
