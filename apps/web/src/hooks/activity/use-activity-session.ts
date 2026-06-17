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
import type {
  StartActivityInput,
  UnresolvedActivityError,
  UseActivitySessionArgs,
} from "@/hooks/activity/types"
import { api } from "#convex/_generated/api"
import { getActivityResumeUrl } from "@/components/activity/routing"
import { isUnresolvedActivityError } from "@/hooks/activity/utils"

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

  const startExperienceActivity = useCallback(
    async (activityInput: StartActivityInput): Promise<ActivityStartResult> => {
      try {
        const activity = await startActivity({
          activity: activityInput,
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

  const startWorkoutActivity = useCallback(
    async ({
      workoutId,
      ftpAtStart,
    }: {
      workoutId: Id<"workouts">
      ftpAtStart: number
    }): Promise<ActivityStartResult> => {
      return await startExperienceActivity({
        sourceKind: "workout",
        workoutId,
        experienceId: "live-workout",
        ftpAtStart,
      })
    },
    [startExperienceActivity]
  )

  const startRouteActivity = useCallback(
    async ({
      routeId,
    }: {
      routeId: Id<"routes">
    }): Promise<ActivityStartResult> => {
      return await startExperienceActivity({
        sourceKind: "route",
        routeId,
        experienceId: "route",
      })
    },
    [startExperienceActivity]
  )

  const startRampTestActivity = useCallback(
    async ({
      builtInId,
      ftpAtStart,
    }: {
      builtInId: string
      ftpAtStart: number
    }): Promise<ActivityStartResult> => {
      return await startExperienceActivity({
        sourceKind: "ramp-test",
        builtInId,
        experienceId: "ramp-test",
        ftpAtStart,
      })
    },
    [startExperienceActivity]
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

  const discardById = useCallback(
    async (targetActivityId: Id<"activities">) => {
      await discardMutation({ activityId: targetActivityId })
      setLocalActivity((current) =>
        current?._id === targetActivityId ? null : current
      )
    },
    [discardMutation]
  )

  const discard = useCallback(async () => {
    await discardById(requireActiveActivityId())
  }, [discardById, requireActiveActivityId])

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
      discardById,
      getResumeUrl,
    }),
    [
      complete,
      discard,
      discardById,
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
