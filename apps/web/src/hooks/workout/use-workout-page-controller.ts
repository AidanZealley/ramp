import { useCallback, useEffect, useMemo, useState } from "react"
import { useConvex, useMutation, useQuery } from "convex/react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import type { FunctionReturnType } from "convex/server"
import type { ConvexError } from "convex/values"
import type { Id } from "#convex/_generated/dataModel"
import type { Interval, PowerDisplayMode } from "@/lib/workout-utils"
import { api } from "#convex/_generated/api"
import { downloadTextFile, workoutToMrc } from "@/lib/exporters"
import { DEFAULT_FTP } from "@/lib/workout-utils"

type WorkoutRecord = NonNullable<FunctionReturnType<typeof api.workouts.get>>
type SettingsRecord = FunctionReturnType<typeof api.settings.get>

interface SaveIntervalsArgs {
  intervals: Array<Interval>
  expectedIntervalsRevision: number
  force?: boolean
}

interface WorkoutPageControllerReadyState {
  status: "ready"
  workout: WorkoutRecord
  settings: SettingsRecord | undefined
  ftp: number
  displayMode: PowerDisplayMode
  actions: {
    changeDisplayMode: (mode: PowerDisplayMode) => Promise<void>
    saveIntervals: (args: SaveIntervalsArgs) => Promise<"saved" | "conflict">
    duplicateWorkout: () => Promise<void>
    deleteWorkout: () => Promise<void>
    exportIntervals: (intervals: Array<Interval>) => void
    goBack: () => void
  }
}

interface WorkoutPageControllerLoadingState {
  status: "loading"
}

interface WorkoutPageControllerNotFoundState {
  status: "notFound"
  goBack: () => void
}

export type WorkoutPageController =
  | WorkoutPageControllerLoadingState
  | WorkoutPageControllerNotFoundState
  | WorkoutPageControllerReadyState

function isIntervalsRevisionConflictError(
  error: unknown
): error is ConvexError<{
  kind: "intervalsRevisionConflict"
  currentIntervalsRevision: number
}> {
  return (
    error instanceof Error &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "kind" in error.data &&
    error.data.kind === "intervalsRevisionConflict"
  )
}

export function useWorkoutPageController(
  workoutId: Id<"workouts">
): WorkoutPageController {
  const navigate = useNavigate()
  const convex = useConvex()
  const workout = useQuery(api.workouts.get, { id: workoutId })
  const settings = useQuery(api.settings.get)
  const updateIntervals = useMutation(api.workouts.updateIntervals)
  const duplicateWorkoutMutation = useMutation(api.workouts.duplicateWorkout)
  const removeWorkout = useMutation(api.workouts.remove)
  const upsertSettings = useMutation(api.settings.upsert)

  const [refreshedWorkout, setRefreshedWorkout] =
    useState<WorkoutRecord | null>(null)

  const ftp = settings?.ftp ?? DEFAULT_FTP
  const displayMode = settings?.powerDisplayMode ?? "percentage"

  useEffect(() => {
    if (
      workout &&
      refreshedWorkout &&
      workout.intervalsRevision >= refreshedWorkout.intervalsRevision
    ) {
      setRefreshedWorkout(null)
    }
  }, [refreshedWorkout, workout])

  const resolvedWorkout = useMemo(() => {
    if (workout === undefined || workout === null) {
      return workout
    }

    if (
      refreshedWorkout &&
      refreshedWorkout.intervalsRevision > workout.intervalsRevision
    ) {
      return refreshedWorkout
    }

    return workout
  }, [refreshedWorkout, workout])

  const goBack = useCallback(() => {
    navigate({ to: "/" })
  }, [navigate])

  const refreshLatestWorkout = useCallback(async () => {
    const latest = await convex.query(api.workouts.get, { id: workoutId })
    setRefreshedWorkout(latest)
    return latest
  }, [convex, workoutId])

  const changeDisplayMode = useCallback(
    async (value: PowerDisplayMode) => {
      if (value === displayMode) return
      await upsertSettings({ powerDisplayMode: value })
    },
    [displayMode, upsertSettings]
  )

  const saveIntervals = useCallback(
    async ({
      intervals,
      expectedIntervalsRevision,
      force,
    }: SaveIntervalsArgs) => {
      if (!resolvedWorkout) return "saved"

      try {
        await updateIntervals({
          id: resolvedWorkout._id,
          intervals,
          expectedIntervalsRevision,
          force,
        })
        return "saved" as const
      } catch (error) {
        if (!force && isIntervalsRevisionConflictError(error)) {
          await refreshLatestWorkout()
          return "conflict" as const
        }

        throw error
      }
    },
    [refreshLatestWorkout, resolvedWorkout, updateIntervals]
  )

  const deleteWorkout = useCallback(async () => {
    if (!resolvedWorkout) return

    await removeWorkout({ id: resolvedWorkout._id })
    toast.success("Workout deleted")
    navigate({ to: "/" })
  }, [navigate, removeWorkout, resolvedWorkout])

  const duplicateWorkout = useCallback(async () => {
    if (!resolvedWorkout) return

    const newWorkoutId = await duplicateWorkoutMutation({
      id: resolvedWorkout._id,
    })
    toast.success("Workout duplicated")
    navigate({ to: "/workout/$id", params: { id: newWorkoutId } })
  }, [duplicateWorkoutMutation, navigate, resolvedWorkout])

  const exportIntervals = useCallback(
    (intervals: Array<Interval>) => {
      if (!resolvedWorkout || intervals.length === 0) return

      const content = workoutToMrc({
        title: resolvedWorkout.title,
        intervals,
      })
      downloadTextFile(content, `${resolvedWorkout.title}.mrc`, "text/plain")
    },
    [resolvedWorkout]
  )

  if (resolvedWorkout === undefined) {
    return { status: "loading" }
  }

  if (resolvedWorkout === null) {
    return {
      status: "notFound",
      goBack,
    }
  }

  return {
    status: "ready",
    workout: resolvedWorkout,
    settings,
    ftp,
    displayMode,
    actions: {
      changeDisplayMode,
      saveIntervals,
      duplicateWorkout,
      deleteWorkout,
      exportIntervals,
      goBack,
    },
  }
}
