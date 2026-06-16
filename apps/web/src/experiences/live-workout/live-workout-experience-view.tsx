import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { Capability } from "@ramp/ride-core"
import { useRideSelector } from "@ramp/ride-react"
import { createWorkoutController } from "@ramp/ride-workouts"
import { LiveWorkoutDashboard } from "./components/live-workout-dashboard"
import { WorkoutDetailPanel } from "./components/workout-detail-panel"
import { WorkoutPickerPanel } from "./components/workout-picker-panel"
import { useLiveWorkoutPreferences } from "./hooks/use-live-workout-preferences"
import type { RideExperienceConnection } from "@/ride/experience-runtime"
import type {
  WorkoutSessionController,
  WorkoutSessionState,
} from "@ramp/ride-workouts"
import type { Id } from "#convex/_generated/dataModel"
import type {
  ActivityClientDoc,
  ActivityExperienceAPI,
} from "@/components/activity/types"
import type { ClientWorkoutDoc } from "@/ride/convex-workout-mapper"
import type { RideSessionController } from "@ramp/ride-core"
import { useUnitFormatters } from "@/hooks/use-unit-formatters"
import { formatActivityDuration } from "@/components/activity/format"
import { UnresolvedActivityDialog } from "@/components/activity/unresolved-activity-dialog"
import { SaveActivityDialog } from "@/components/activity/save-activity-dialog"
import { api } from "#convex/_generated/api"
import {
  InvalidWorkoutDefinitionError,
  toWorkoutDefinition,
} from "@/ride/convex-workout-mapper"
import { startActivityTransaction } from "@/hooks/activity/start-activity-transaction"

type WorkoutDoc = ClientWorkoutDoc

const subscribeToPendingWorkout = () => () => undefined

const pendingWorkoutState: WorkoutSessionState = {
  activeWorkoutId: null,
  activeSegmentLabel: null,
  activeSegmentIndex: null,
  targetWatts: null,
  difficultyPercent: 100,
  isActive: false,
  elapsedSeconds: 0,
  totalDurationSeconds: 0,
  isComplete: false,
  controlStatus: "idle",
  lastError: null,
}

function hasPositiveDuration(workout: WorkoutDoc | null): boolean {
  return (
    workout?.intervals.some((interval) => interval.durationSeconds > 0) ?? false
  )
}

function getWorkoutErrorCopy(reason: string | null): string | null {
  if (!reason) return null
  if (reason === "capability-unsupported") {
    return "Connected trainer does not support ERG target power."
  }
  if (reason.startsWith("invalid-workout:")) {
    return "Workout data is invalid."
  }
  if (reason.startsWith("invalid-command:")) {
    return "Workout command was rejected as unsafe."
  }
  return "Unable to start workout."
}

function getTrainerErrorCopy(code: string | undefined): string | null {
  if (!code) return null
  switch (code) {
    case "permission":
      return "Permission denied. Please allow Bluetooth access."
    case "timeout":
      return "Connection timed out. Please try again."
    case "unsupported":
      return "This trainer is not supported."
    case "command-rejected":
      return "Trainer rejected the command."
    case "transport":
      return "Communication error with trainer."
    default:
      return "An unexpected error occurred."
  }
}

export function LiveWorkoutExperienceView({
  connection,
  search,
  session,
  activity,
}: {
  connection?: RideExperienceConnection
  search?: {
    activityId?: string
    workoutId?: string
  }
  session: RideSessionController
  activity?: ActivityExperienceAPI
}) {
  const navigate = useNavigate({ from: "/ride/$experienceId" })
  const trainerConnected = useRideSelector(session, (s) => s.trainerConnected)
  const trainerStatus = useRideSelector(
    session,
    (s) => s.telemetry.trainerStatus
  )
  const trainerSource = useRideSelector(
    session,
    (s) => s.telemetry.telemetrySource
  )
  const lastTrainerError = useRideSelector(session, (s) => s.lastTrainerError)
  const [workoutController, setWorkoutController] =
    useState<WorkoutSessionController | null>(null)

  useEffect(() => {
    const nextController = createWorkoutController({ session })
    setWorkoutController(nextController)

    return () => {
      nextController.dispose()
      setWorkoutController(null)
    }
  }, [session])

  const workoutState = useSyncExternalStore(
    workoutController?.subscribe ?? subscribeToPendingWorkout,
    workoutController?.getState ?? (() => pendingWorkoutState),
    workoutController?.getState ?? (() => pendingWorkoutState)
  )

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const workouts = useQuery(api.workouts.list)
  const completeActivity = useMutation(api.activities.complete)
  const markPendingActivity = useMutation(api.activities.markPending)
  const { ftp, preferencesReady } = useLiveWorkoutPreferences()

  const [selectedWorkoutId, setSelectedWorkoutId] =
    useState<Id<"workouts"> | null>(null)
  const [activeWorkout, setActiveWorkout] = useState<WorkoutDoc | null>(null)
  const [activeFtp, setActiveFtp] = useState(ftp)
  const [startError, setStartError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [blockedActivity, setBlockedActivity] =
    useState<ActivityClientDoc | null>(null)
  const [reviewActivity, setReviewActivity] =
    useState<ActivityClientDoc | null>(null)
  const units = useUnitFormatters()
  const [retryAfterResolve, setRetryAfterResolve] = useState(false)
  const [activityDialogBusy, setActivityDialogBusy] = useState(false)
  const lastLinkedWorkoutId = useRef<Id<"workouts"> | undefined>(undefined)
  const loadedActivityId = useRef<string | null>(null)

  const supportsTargetPower = session.controls
    .getCapabilities()
    .has(Capability.TargetPower)

  const isLoading = workouts === undefined || !preferencesReady
  const linkedWorkoutId = search?.workoutId as Id<"workouts"> | undefined
  const linkedActivityId = search?.activityId
  const selectedWorkout: WorkoutDoc | null =
    workouts?.find((workout) => workout._id === selectedWorkoutId) ?? null
  const selectedWorkoutHasDuration = hasPositiveDuration(selectedWorkout)
  const selectionError =
    !isLoading &&
    linkedWorkoutId &&
    !activeWorkout &&
    !workouts.some((workout) => workout._id === linkedWorkoutId)
      ? "Workout not found. Pick another workout."
      : null

  useEffect(() => {
    if (activeWorkout || workouts === undefined) return
    if (
      linkedWorkoutId === lastLinkedWorkoutId.current &&
      selectedWorkoutId === linkedWorkoutId
    ) {
      return
    }
    if (!linkedWorkoutId) {
      if (lastLinkedWorkoutId.current) {
        setSelectedWorkoutId(null)
      }
      lastLinkedWorkoutId.current = undefined
      return
    }
    const hasLinkedWorkout = workouts.some(
      (workout) => workout._id === linkedWorkoutId
    )
    lastLinkedWorkoutId.current = linkedWorkoutId
    setSelectedWorkoutId(hasLinkedWorkout ? linkedWorkoutId : null)
  }, [activeWorkout, linkedWorkoutId, selectedWorkoutId, workouts])

  useEffect(() => {
    setStartError(null)
  }, [selectedWorkoutId, trainerConnected, supportsTargetPower])

  const workoutFromSnapshot = useCallback(
    (sourceActivity: ActivityClientDoc): WorkoutDoc | null => {
      const snapshot = sourceActivity.sourceSnapshot
      if (snapshot.kind !== "workout") return null
      return {
        _id: snapshot.workoutId,
        _creationTime: sourceActivity._creationTime,
        ownerId: sourceActivity.ownerId,
        title: snapshot.title,
        intervalsRevision: snapshot.intervalsRevision,
        intervals: snapshot.intervals,
        summary: {
          totalDurationSeconds: snapshot.totalDurationSeconds,
          stressScore: 0,
        },
      }
    },
    []
  )

  useEffect(() => {
    const resumeActivity = activity?.resumeActivity
    if (!resumeActivity || !linkedActivityId || !workoutController) return
    if (loadedActivityId.current === resumeActivity._id) return
    if (resumeActivity.sourceSnapshot.kind !== "workout") return

    if (resumeActivity.status === "pending") {
      loadedActivityId.current = resumeActivity._id
      setReviewActivity(resumeActivity)
      return
    }

    if (resumeActivity.status !== "in_progress") return
    if (resumeActivity.resumeState.kind !== "workout") return

    const snapshotWorkout = workoutFromSnapshot(resumeActivity)
    if (!snapshotWorkout) return
    const workoutSnapshot = resumeActivity.sourceSnapshot
    const workoutResumeState = resumeActivity.resumeState

    loadedActivityId.current = resumeActivity._id
    void (async () => {
      try {
        const result = await workoutController.loadWorkout(
          toWorkoutDefinition(snapshotWorkout),
          workoutSnapshot.ftpAtStart
        )
        if (!mounted.current || !result.ok) return
        session.pause()
        await workoutController.setDifficultyPercent(
          workoutResumeState.difficultyPercent
        )
        await workoutController.seekToElapsedSeconds(
          workoutResumeState.elapsedSeconds
        )
        setActiveFtp(workoutSnapshot.ftpAtStart)
        setActiveWorkout(snapshotWorkout)
      } catch (error) {
        console.error("[live-workout] resume failed", error)
        setStartError("Unable to resume workout activity.")
      }
    })()
  }, [
    activity?.resumeActivity,
    linkedActivityId,
    session,
    workoutController,
    workoutFromSnapshot,
  ])

  const handleStart = useCallback(async () => {
    if (
      !workoutController ||
      !selectedWorkout ||
      !trainerConnected ||
      !selectedWorkoutHasDuration
    ) {
      return
    }

    setIsStarting(true)

    try {
      let startedWorkout = selectedWorkout
      const transaction = await startActivityTransaction({
        startActivity: async () => {
          if (!activity) return { ok: true, activity: null }
          return await activity.startWorkoutActivity({
            workoutId: selectedWorkout._id,
            ftpAtStart: ftp,
          })
        },
        discardActivity: async (createdActivity) => {
          await activity?.discardById(createdActivity._id)
        },
        resetLocal: () => {
          workoutController.clearWorkout()
          setActiveWorkout(null)
        },
        startLocal: async (createdActivity) => {
          let workoutToLoad = selectedWorkout
          let ftpForWorkout = ftp

          if (createdActivity) {
            const snapshotWorkout = workoutFromSnapshot(createdActivity)
            if (
              snapshotWorkout &&
              createdActivity.sourceSnapshot.kind === "workout"
            ) {
              workoutToLoad = snapshotWorkout
              ftpForWorkout = createdActivity.sourceSnapshot.ftpAtStart
            }
          }

          const definition = toWorkoutDefinition(workoutToLoad)
          workoutController.clearWorkout()
          const result = await workoutController.loadWorkout(
            definition,
            ftpForWorkout
          )
          if (!result.ok) {
            throw new Error(result.reason)
          }

          session.pause()
          setStartError(null)
          setActiveFtp(ftpForWorkout)
          setActiveWorkout(workoutToLoad)
          startedWorkout = workoutToLoad
        },
      })

      if (!mounted.current) return
      if (!transaction.ok) {
        if (transaction.reason === "unresolvedActivityExists") {
          setBlockedActivity(transaction.activity)
          return
        }
        if (transaction.error instanceof InvalidWorkoutDefinitionError) {
          setStartError("Workout data is invalid.")
          return
        }
        const reason =
          transaction.error instanceof Error ? transaction.error.message : null
        setStartError(getWorkoutErrorCopy(reason) ?? "Unable to start workout.")
        return
      }
      const createdActivity = transaction.activity
      if (createdActivity) {
        void navigate({
          search: (previous) => ({
            ...previous,
            activityId: createdActivity._id,
            workoutId:
              createdActivity.sourceSnapshot.kind === "workout"
                ? createdActivity.sourceSnapshot.workoutId
                : startedWorkout._id,
          }),
          replace: true,
        })
      }
    } catch (error: unknown) {
      console.error("[live-workout] start failed", error)
      if (!mounted.current) return
      setActiveWorkout(null)
      if (error instanceof InvalidWorkoutDefinitionError) {
        setStartError("Workout data is invalid.")
        return
      }
      setStartError("Unable to start workout.")
    } finally {
      if (mounted.current) {
        setIsStarting(false)
      }
    }
  }, [
    ftp,
    selectedWorkout,
    selectedWorkoutHasDuration,
    session,
    supportsTargetPower,
    trainerConnected,
    workoutController,
    activity,
    navigate,
    workoutFromSnapshot,
  ])

  const handleEnd = useCallback(() => {
    if (!workoutController) return
    workoutController.clearWorkout()
    setActiveWorkout(null)
    setActiveFtp(ftp)
    setStartError(null)
  }, [ftp, workoutController])

  const handleSelectWorkout = useCallback(
    (nextWorkoutId: Id<"workouts">) => {
      setSelectedWorkoutId(nextWorkoutId)
      void navigate({
        search: (previous) => ({
          ...previous,
          workoutId: nextWorkoutId,
        }),
        replace: true,
      })
    },
    [navigate]
  )

  const handleSeek = useCallback(
    async (elapsedSeconds: number) => {
      if (!workoutController) return
      await workoutController.seekToElapsedSeconds(elapsedSeconds)
    },
    [workoutController]
  )

  const handleDifficultyChange = useCallback(
    async (difficultyPercent: number) => {
      if (!workoutController) return
      await workoutController.setDifficultyPercent(difficultyPercent)
    },
    [workoutController]
  )

  const handleDifficultyReset = useCallback(async () => {
    if (!workoutController) return
    await workoutController.resetDifficultyPercent()
  }, [workoutController])

  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto px-4 pt-16 pb-6 sm:px-8 sm:pt-20">
      <UnresolvedActivityDialog
        open={blockedActivity !== null}
        activity={blockedActivity}
        busy={activityDialogBusy}
        onOpenChange={(open) => {
          if (!open) setBlockedActivity(null)
        }}
        onResume={() => {
          if (!blockedActivity || !activity) return
          void navigate(activity.getResumeUrl(blockedActivity))
        }}
        onSaveExisting={async () => {
          if (!blockedActivity) return
          setActivityDialogBusy(true)
          try {
            if (blockedActivity.status === "in_progress") {
              await markPendingActivity({
                activityId: blockedActivity._id,
                summary: blockedActivity.summary,
                resumeState: blockedActivity.resumeState,
              })
            }
            setReviewActivity({ ...blockedActivity, status: "pending" })
            setRetryAfterResolve(true)
            setBlockedActivity(null)
          } finally {
            setActivityDialogBusy(false)
          }
        }}
        onDiscardExisting={async () => {
          if (!blockedActivity) return
          setActivityDialogBusy(true)
          try {
            await activity?.discardById(blockedActivity._id)
            setBlockedActivity(null)
            await handleStart()
          } finally {
            setActivityDialogBusy(false)
          }
        }}
      />
      <SaveActivityDialog
        open={reviewActivity !== null}
        defaultTitle={reviewActivity?.title ?? ""}
        description="Review the activity title before saving it to history."
        metrics={
          reviewActivity
            ? [
                {
                  label: "Time",
                  value: formatActivityDuration(
                    reviewActivity.summary.durationSeconds
                  ),
                },
                {
                  label: "Distance",
                  value: units.distance(reviewActivity.summary.distanceMeters),
                },
              ]
            : []
        }
        saving={activityDialogBusy}
        discarding={activityDialogBusy}
        onOpenChange={(open) => {
          if (!open) setReviewActivity(null)
        }}
        onSave={async (title) => {
          if (!reviewActivity) return
          setActivityDialogBusy(true)
          try {
            await completeActivity({
              activityId: reviewActivity._id,
              title,
            })
            setReviewActivity(null)
            if (retryAfterResolve) {
              setRetryAfterResolve(false)
              await handleStart()
            }
          } finally {
            setActivityDialogBusy(false)
          }
        }}
        onDiscard={async () => {
          if (!reviewActivity) return
          setActivityDialogBusy(true)
          try {
            await activity?.discardById(reviewActivity._id)
            setReviewActivity(null)
            if (retryAfterResolve) {
              setRetryAfterResolve(false)
              await handleStart()
            }
          } finally {
            setActivityDialogBusy(false)
          }
        }}
      />
      {workoutController == null ? null : activeWorkout ? (
        <LiveWorkoutDashboard
          activity={activity}
          onEnd={handleEnd}
          onReconnect={connection?.reconnect}
          onPause={session.pause}
          onResume={session.resume}
          onSeek={handleSeek}
          onDifficultyChange={handleDifficultyChange}
          onDifficultyReset={handleDifficultyReset}
          ftp={activeFtp}
          session={session}
          workout={activeWorkout}
          workoutState={workoutState}
        />
      ) : (
        <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <WorkoutPickerPanel
            isLoading={isLoading}
            onSelect={handleSelectWorkout}
            selectedWorkoutId={selectedWorkoutId}
            workouts={workouts ?? []}
          />
          <WorkoutDetailPanel
            ftp={ftp}
            isLoading={isLoading}
            isStarting={isStarting}
            onStart={() => {
              void handleStart()
            }}
            selectionError={selectionError}
            startError={
              startError ??
              getTrainerErrorCopy(lastTrainerError?.code) ??
              getWorkoutErrorCopy(workoutState.lastError)
            }
            trainerConnected={trainerConnected}
            trainerStatus={trainerStatus}
            trainerSupportsTargetPower={supportsTargetPower}
            trainerSource={trainerSource}
            workout={selectedWorkout}
            workoutHasDuration={selectedWorkoutHasDuration}
          />
        </div>
      )}
    </div>
  )
}
