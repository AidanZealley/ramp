import { useCallback, useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { useNavigate } from "@tanstack/react-router"
import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"
import { downloadTextFile, workoutToMrc } from "@/lib/exporters"
import {
  DEFAULT_FTP,
  getWorkoutStats,
  type Interval,
  type PowerDisplayMode,
  type WorkoutStats,
} from "@/lib/workout-utils"

interface WorkoutDraft {
  title: string
  intervals: Interval[]
}

interface WorkoutPageControllerReadyState {
  status: "ready"
  ftp: number
  displayMode: PowerDisplayMode
  workingCopy: WorkoutDraft
  isDirty: boolean
  stats: WorkoutStats
  showDeleteDialog: boolean
  setShowDeleteDialog: (open: boolean) => void
  actions: {
    changeIntervals: (intervals: Interval[]) => void
    changeDisplayMode: (mode: PowerDisplayMode) => Promise<void>
    save: () => Promise<void>
    revert: () => void
    deleteWorkout: () => Promise<void>
    exportMrc: () => void
    requestDelete: () => void
    goBack: () => void
    appendIntervalFallback: () => void
  }
  editorBridge: {
    registerInsertAction: (fn: (() => void) | null) => void
    addInterval: () => void
    hasMountedEditor: boolean
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

function cloneIntervals(intervals: Interval[]) {
  return intervals.map((interval) => ({ ...interval }))
}

function intervalsEqual(a: Interval[], b: Interval[]) {
  if (a === b) return true
  if (a.length !== b.length) return false

  return a.every((interval, index) => {
    const other = b[index]
    return (
      interval.startPower === other?.startPower &&
      interval.endPower === other?.endPower &&
      interval.durationSeconds === other?.durationSeconds
    )
  })
}

function draftMatchesWorkout(workout: WorkoutDraft, draft: WorkoutDraft) {
  return intervalsEqual(workout.intervals, draft.intervals)
}

export function useWorkoutPageController(
  workoutId: Id<"workouts">
): WorkoutPageController {
  const navigate = useNavigate()
  const workout = useQuery(api.workouts.get, { id: workoutId })
  const settings = useQuery(api.settings.get)
  const updateWorkout = useMutation(api.workouts.update)
  const removeWorkout = useMutation(api.workouts.remove)
  const upsertSettings = useMutation(api.settings.upsert)

  const [draft, setDraft] = useState<WorkoutDraft | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [insertAction, setInsertAction] = useState<(() => void) | null>(null)

  const ftp = settings?.ftp ?? DEFAULT_FTP
  const displayMode = settings?.powerDisplayMode ?? "percentage"

  const goBack = useCallback(() => {
    navigate({ to: "/" })
  }, [navigate])

  const sourceWorkout = useMemo<WorkoutDraft | null>(() => {
    if (!workout) return null
    return {
      title: workout.title,
      intervals: cloneIntervals(workout.intervals),
    }
  }, [workout])

  const updateDraft = useCallback(
    (updater: (base: WorkoutDraft) => WorkoutDraft) => {
      if (!sourceWorkout) return

      setDraft((currentDraft) => {
        const base = currentDraft ?? sourceWorkout
        const nextDraft = updater({
          title: sourceWorkout.title,
          intervals: cloneIntervals(base.intervals),
        })

        return draftMatchesWorkout(sourceWorkout, nextDraft) ? null : nextDraft
      })
    },
    [sourceWorkout]
  )

  const changeIntervals = useCallback(
    (intervals: Interval[]) => {
      updateDraft((base) => ({
        ...base,
        intervals: cloneIntervals(intervals),
      }))
    },
    [updateDraft]
  )

  const appendIntervalFallback = useCallback(() => {
    updateDraft((base) => ({
      ...base,
      intervals: [
        ...base.intervals,
        {
          startPower: 75,
          endPower: 75,
          durationSeconds: 300,
        },
      ],
    }))
  }, [updateDraft])

  const addInterval = useCallback(() => {
    if (insertAction) {
      insertAction()
      return
    }

    appendIntervalFallback()
  }, [appendIntervalFallback, insertAction])

  const changeDisplayMode = useCallback(
    async (value: PowerDisplayMode) => {
      if (value === displayMode) return
      await upsertSettings({ powerDisplayMode: value })
    },
    [displayMode, upsertSettings]
  )

  const save = useCallback(async () => {
    if (!draft || !workout) return

    await updateWorkout({
      id: workout._id,
      title: workout.title,
      intervals: draft.intervals,
    })
    setDraft(null)
  }, [draft, updateWorkout, workout])

  const revert = useCallback(() => {
    setDraft(null)
  }, [])

  const deleteWorkout = useCallback(async () => {
    if (!workout) return

    await removeWorkout({ id: workout._id })
    setShowDeleteDialog(false)
    navigate({ to: "/" })
  }, [navigate, removeWorkout, workout])

  const exportMrc = useCallback(() => {
    if (!workout) return

    const workingCopy = draft ?? sourceWorkout
    if (!workingCopy || workingCopy.intervals.length === 0) return

    const content = workoutToMrc({
      title: workout.title,
      intervals: workingCopy.intervals,
    })
    downloadTextFile(content, `${workout.title}.mrc`, "text/plain")
  }, [draft, sourceWorkout, workout])

  const requestDelete = useCallback(() => {
    setShowDeleteDialog(true)
  }, [])

  const registerInsertAction = useCallback((fn: (() => void) | null) => {
    setInsertAction(() => fn)
  }, [])

  if (workout === undefined) {
    return { status: "loading" }
  }

  if (workout === null || sourceWorkout === null) {
    return {
      status: "notFound",
      goBack,
    }
  }

  const workingCopy = draft ?? sourceWorkout

  return {
    status: "ready",
    ftp,
    displayMode,
    workingCopy,
    isDirty: draft !== null,
    stats: getWorkoutStats(workingCopy.intervals),
    showDeleteDialog,
    setShowDeleteDialog,
    actions: {
      changeIntervals,
      changeDisplayMode,
      save,
      revert,
      deleteWorkout,
      exportMrc,
      requestDelete,
      goBack,
      appendIntervalFallback,
    },
    editorBridge: {
      registerInsertAction,
      addInterval,
      hasMountedEditor: insertAction !== null,
    },
  }
}
