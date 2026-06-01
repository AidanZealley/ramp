import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { Capability } from "@ramp/ride-core"
import { useRideSelector } from "@ramp/ride-react"
import { createWorkoutController } from "@ramp/ride-workouts"
import { useLiveWorkoutPreferences } from "../live-workout/hooks/use-live-workout-preferences"
import { RampTestDashboard } from "./components/ramp-test-dashboard"
import { useRampTestMonitor } from "./hooks/use-ramp-test-monitor"
import {
  RAMP_TEST_BUILT_IN_ID,
  RAMP_TEST_INTERVALS,
  RAMP_TEST_TITLE,
  getRampTestDefinition,
} from "./ramp-protocol"
import type { RideExperienceConnection } from "@/ride/experience-runtime"
import type {
  WorkoutRideSession,
  WorkoutSessionController,
  WorkoutSessionState,
} from "@ramp/ride-workouts"
import type { Interval } from "@/lib/workout-utils"
import type {
  ActivityClientDoc,
  ActivityExperienceAPI,
} from "@/components/activity/types"
import type { ExperienceSessionAPI } from "@/ride/experience-session"
import { SaveActivityDialog } from "@/components/activity/save-activity-dialog"
import { UnresolvedActivityDialog } from "@/components/activity/unresolved-activity-dialog"
import { formatActivityDuration } from "@/components/activity/format"
import { useUnitFormatters } from "@/hooks/use-unit-formatters"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { api } from "#convex/_generated/api"
import { startActivityTransaction } from "@/hooks/activity/start-activity-transaction"

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

const rampIntervals: Array<Interval> = RAMP_TEST_INTERVALS.map((interval) => ({
  ...interval,
}))

export function RampTestExperienceView({
  connection,
  search,
  session,
  activity,
}: {
  connection?: RideExperienceConnection
  search?: {
    activityId?: string
  }
  session: ExperienceSessionAPI
  activity?: ActivityExperienceAPI
}) {
  const navigate = useNavigate({ from: "/ride/$experienceId" })
  const trainerConnected = useRideSelector(session, (s) => s.trainerConnected)
  const trainerSource = useRideSelector(
    session,
    (s) => s.telemetry.telemetrySource
  )
  const [workoutController, setWorkoutController] =
    useState<WorkoutSessionController | null>(null)
  const workoutSession = useMemo<WorkoutRideSession>(
    () => ({
      getState: session.getState,
      subscribe: session.subscribe,
      controls: {
        dispatch: (command, _source, options) =>
          session.controls.dispatch(command, "experience", options),
        getCapabilities: session.controls.getCapabilities,
      },
    }),
    [session]
  )

  useEffect(() => {
    const nextController = createWorkoutController({ session: workoutSession })
    setWorkoutController(nextController)
    return () => {
      nextController.dispose()
      setWorkoutController(null)
    }
  }, [workoutSession])

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

  const completeActivity = useMutation(api.activities.complete)
  const markPendingActivity = useMutation(api.activities.markPending)
  const { ftp, preferencesReady } = useLiveWorkoutPreferences()
  const units = useUnitFormatters()

  const [started, setStarted] = useState(false)
  const [activeFtp, setActiveFtp] = useState(ftp)
  const [startError, setStartError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [blockedActivity, setBlockedActivity] =
    useState<ActivityClientDoc | null>(null)
  const [reviewActivity, setReviewActivity] =
    useState<ActivityClientDoc | null>(null)
  const [retryAfterResolve, setRetryAfterResolve] = useState(false)
  const [activityDialogBusy, setActivityDialogBusy] = useState(false)
  const loadedActivityId = useRef<string | null>(null)

  const supportsTargetPower = session.controls
    .getCapabilities()
    .has(Capability.TargetPower)
  const linkedActivityId = search?.activityId

  const monitor = useRampTestMonitor({
    session,
    workoutController,
    active: started,
  })

  useEffect(() => {
    setStartError(null)
  }, [trainerConnected, supportsTargetPower])

  const handleStart = useCallback(async () => {
    if (!workoutController || !trainerConnected || !supportsTargetPower) {
      return
    }

    setIsStarting(true)
    try {
      const transaction = await startActivityTransaction({
        startActivity: async () => {
          if (!activity) return { ok: true, activity: null }
          return await activity.startRampTestActivity({
            builtInId: RAMP_TEST_BUILT_IN_ID,
            ftpAtStart: ftp,
          })
        },
        discardActivity: async (createdActivity) => {
          await activity?.discardById(createdActivity._id)
        },
        resetLocal: () => {
          workoutController.clearWorkout()
          setStarted(false)
        },
        startLocal: async (createdActivity) => {
          const ftpForTest =
            createdActivity?.sourceSnapshot.kind === "ramp-test"
              ? createdActivity.sourceSnapshot.ftpAtStart
              : ftp

          workoutController.clearWorkout()
          const result = await workoutController.loadWorkout(
            getRampTestDefinition(),
            ftpForTest
          )

          if (!result.ok) {
            throw new Error(result.reason ?? "Unable to start ramp test.")
          }

          session.pause()
          setStartError(null)
          setActiveFtp(ftpForTest)
          setStarted(true)
        },
      })

      if (!mounted.current) return
      if (!transaction.ok) {
        if (transaction.reason === "unresolvedActivityExists") {
          setBlockedActivity(transaction.activity)
          return
        }
        setStartError("Unable to start ramp test.")
        return
      }
      if (transaction.activity) {
        const activityId = transaction.activity._id
        void navigate({
          search: (previous) => ({
            ...previous,
            activityId,
          }),
          replace: true,
        })
      }
    } catch (error) {
      console.error("[ramp-test] start failed", error)
      if (!mounted.current) return
      workoutController.clearWorkout()
      setStarted(false)
      setStartError("Unable to start ramp test.")
    } finally {
      if (mounted.current) {
        setIsStarting(false)
      }
    }
  }, [
    activity,
    ftp,
    navigate,
    session,
    supportsTargetPower,
    trainerConnected,
    workoutController,
  ])

  useEffect(() => {
    const resumeActivity = activity?.resumeActivity
    if (!resumeActivity || !linkedActivityId || !workoutController) return
    if (loadedActivityId.current === resumeActivity._id) return
    if (resumeActivity.sourceSnapshot.kind !== "ramp-test") return

    if (resumeActivity.status === "pending") {
      loadedActivityId.current = resumeActivity._id
      setReviewActivity(resumeActivity)
      return
    }

    if (resumeActivity.status !== "in_progress") return
    if (resumeActivity.resumeState.kind !== "ramp-test") return

    const snapshot = resumeActivity.sourceSnapshot
    const resumeState = resumeActivity.resumeState
    loadedActivityId.current = resumeActivity._id
    void (async () => {
      try {
        const result = await workoutController.loadWorkout(
          getRampTestDefinition(),
          snapshot.ftpAtStart
        )
        if (!mounted.current || !result.ok) return
        session.pause()
        await workoutController.seekToElapsedSeconds(resumeState.elapsedSeconds)
        setActiveFtp(snapshot.ftpAtStart)
        setStarted(true)
      } catch (error) {
        console.error("[ramp-test] resume failed", error)
        setStartError("Unable to resume ramp test.")
      }
    })()
  }, [activity?.resumeActivity, linkedActivityId, session, workoutController])

  const handleEnd = useCallback(() => {
    if (!workoutController) return
    workoutController.clearWorkout()
    setStarted(false)
    setActiveFtp(ftp)
    setStartError(null)
  }, [ftp, workoutController])

  const handleSeek = useCallback(
    async (elapsedSeconds: number) => {
      if (!workoutController) return
      await workoutController.seekToElapsedSeconds(elapsedSeconds)
    },
    [workoutController]
  )

  const startDisabled =
    !workoutController ||
    !trainerConnected ||
    !supportsTargetPower ||
    !preferencesReady ||
    isStarting

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
            await completeActivity({ activityId: reviewActivity._id, title })
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
      {workoutController == null ? null : started ? (
        <RampTestDashboard
          title={RAMP_TEST_TITLE}
          intervals={rampIntervals}
          ftp={activeFtp}
          session={session}
          workoutState={workoutState}
          phase={monitor.phase}
          calculatedFtp={monitor.calculatedFtp}
          failed={monitor.failed}
          onEnd={handleEnd}
          onReconnect={connection?.reconnect}
          onPause={session.pause}
          onResume={session.resume}
          onSeek={handleSeek}
          activity={activity}
        />
      ) : (
        <div className="mx-auto flex w-full max-w-2xl flex-1 items-center">
          <Card
            size="sm"
            className="w-full bg-background/85 shadow-xl backdrop-blur-md"
          >
            <CardContent className="flex flex-col gap-4">
              <div>
                <h2 className="font-heading text-xl font-semibold tracking-tight">
                  Ramp Test
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Find your FTP with a progressive ramp. After a short warmup
                  the target steps up by 20 W every minute. Hold each step as
                  long as you can — when you can no longer keep up, the test
                  drops into a cooldown and estimates your FTP at 75% of your
                  best minute.
                </p>
              </div>
              <Button
                type="button"
                size="lg"
                onClick={() => void handleStart()}
                disabled={startDisabled}
                className="w-full"
              >
                {isStarting ? "Starting..." : "Start test"}
              </Button>
              <p className="text-center text-[0.7rem] text-muted-foreground">
                {!trainerConnected
                  ? "Connect a trainer or use the simulator to start."
                  : !supportsTargetPower
                    ? "Connected trainer does not support ERG target power."
                    : trainerSource === "simulated"
                      ? "Simulator ready for the ramp test."
                      : `ERG mode · current FTP ${ftp} W`}
              </p>
              {startError ? (
                <p className="text-center text-[0.75rem] text-destructive">
                  {startError}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
