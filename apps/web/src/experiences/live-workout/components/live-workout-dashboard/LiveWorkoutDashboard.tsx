import { useEffect, useRef, useState } from "react"
import Confetti from "react-confetti"
import { useRideSelector, useRideThrottledSelector } from "@ramp/ride-react"
import {
  MAX_DIFFICULTY_PERCENT,
  MIN_DIFFICULTY_PERCENT,
} from "@ramp/ride-workouts"
import { DisconnectedOverlay } from "./components/disconnected-overlay"
import { DifficultyControl } from "./components/difficulty-control"
import { IntervalComment } from "./components/interval-comment"
import { TelemetryStaleBadge } from "./components/telemetry-stale-badge"
import { WorkoutCompleteDialog } from "./components/workout-complete-dialog"
import { WorkoutProgressOverview } from "./components/workout-progress-overview"
import { useIntervalCountdownBeeps } from "./use-interval-countdown-beeps"
import { useWorkoutKeypresses } from "./use-workout-keypresses"
import {
  getCompletedIntervalCount,
  getIntervalBounds,
  getIntervalProgressPercent,
  getIntervalRemainingSeconds,
  getTotalDurationSeconds,
  getWorkoutRemainingSeconds,
} from "./utils"
import type { WorkoutCompletionSummary } from "./components/workout-complete-dialog"
import type { RideSessionController } from "@ramp/ride-core"
import type { WorkoutSessionState } from "@ramp/ride-workouts"
import type { ClientWorkoutDoc } from "@/ride/convex-workout-mapper"
import {
  RideDashboardMetric,
  RideHeartCadenceModule,
  RidePowerModule,
} from "@/components/ride/ride-dashboard"
import { formatDuration } from "@/lib/workout-utils"

type LiveWorkoutDashboardProps = {
  onEnd: () => void
  onReconnect?: () => void
  onPause?: () => void
  onResume?: () => void
  onSeek: (elapsedSeconds: number) => void | Promise<void>
  onDifficultyChange: (difficultyPercent: number) => void | Promise<void>
  onDifficultyReset: () => void | Promise<void>
  session: RideSessionController
  workout: ClientWorkoutDoc
  workoutState: WorkoutSessionState
}

function getDisconnectErrorCopy(code: string | undefined): string | null {
  if (!code) return null
  switch (code) {
    case "permission":
      return "Bluetooth permission was denied."
    case "timeout":
      return "Connection timed out."
    case "transport":
      return "Communication error with trainer."
    default:
      return null
  }
}

function useViewportSize() {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateViewportSize()
    window.addEventListener("resize", updateViewportSize)
    return () => window.removeEventListener("resize", updateViewportSize)
  }, [])

  return viewportSize
}

export function LiveWorkoutDashboard({
  onEnd,
  onReconnect,
  onPause,
  onResume,
  onSeek,
  onDifficultyChange,
  onDifficultyReset,
  session,
  workout,
  workoutState,
}: LiveWorkoutDashboardProps) {
  const trainerConnected = useRideSelector(session, (s) => s.trainerConnected)
  const telemetryStatus = useRideSelector(
    session,
    (s) => s.telemetry.telemetryStatus
  )
  const telemetry = useRideThrottledSelector(session, (s) => s.telemetry, {
    hz: 2,
  })
  const paused = useRideSelector(session, (s) => s.paused)
  const lastTrainerErrorCode = useRideSelector(
    session,
    (s) => s.lastTrainerError?.code
  )
  const viewportSize = useViewportSize()
  const hasPausedForDisconnect = useRef(false)
  const previousIsComplete = useRef(workoutState.isComplete)
  const [completionSummary, setCompletionSummary] =
    useState<WorkoutCompletionSummary | null>(null)
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [manualSeekKey, setManualSeekKey] = useState(0)
  const { stopDialogOpen, setStopDialogOpen } = useWorkoutKeypresses({
    difficultyPercent: workoutState.difficultyPercent,
    isComplete: workoutState.isComplete,
    paused,
    onDifficultyChange,
    onPause,
    onResume,
  })

  // Auto-pause when trainer disconnects
  useEffect(() => {
    if (!trainerConnected && !paused && !hasPausedForDisconnect.current) {
      hasPausedForDisconnect.current = true
      onPause?.()
    } else if (trainerConnected && hasPausedForDisconnect.current) {
      hasPausedForDisconnect.current = false
      onResume?.()
    }
  }, [paused, trainerConnected, onPause, onResume])

  const showDisconnectedOverlay =
    !trainerConnected && workoutState.isActive && !workoutState.isComplete
  const showStaleBadge =
    telemetryStatus === "stale" && trainerConnected && !workoutState.isComplete

  const totalDurationSeconds = getTotalDurationSeconds(
    workoutState.totalDurationSeconds,
    workout.intervals
  )
  const elapsedSeconds = Math.max(
    0,
    Math.min(workoutState.elapsedSeconds, totalDurationSeconds)
  )
  const completionDurationSeconds =
    workoutState.isComplete && elapsedSeconds === 0
      ? totalDurationSeconds
      : elapsedSeconds
  const workoutRemainingSeconds = getWorkoutRemainingSeconds(
    totalDurationSeconds,
    elapsedSeconds
  )
  const intervalBounds = getIntervalBounds(
    workout.intervals,
    workoutState.activeSegmentIndex
  )
  const intervalRemainingSeconds = getIntervalRemainingSeconds(
    intervalBounds,
    elapsedSeconds
  )
  const intervalProgressPercent = getIntervalProgressPercent(
    intervalBounds,
    elapsedSeconds
  )
  const completedIntervalCount = getCompletedIntervalCount(
    workout.intervals,
    elapsedSeconds,
    workoutState.isComplete
  )
  const currentInterval =
    workoutState.activeSegmentIndex === null
      ? null
      : workout.intervals[workoutState.activeSegmentIndex]
  const currentComment = currentInterval?.comment?.trim() ?? ""
  const intervalWarning =
    intervalRemainingSeconds <= 5 &&
    intervalRemainingSeconds > 0 &&
    !workoutState.isComplete

  useIntervalCountdownBeeps({
    activeSegmentIndex: workoutState.activeSegmentIndex,
    intervalRemainingSeconds,
    isActive: workoutState.isActive,
    isComplete: workoutState.isComplete,
    paused,
    suppressForSeekKey: manualSeekKey,
  })

  const handleSeek = (nextElapsedSeconds: number) => {
    setManualSeekKey((key) => key + 1)
    return onSeek(nextElapsedSeconds)
  }

  useEffect(() => {
    if (!previousIsComplete.current && workoutState.isComplete) {
      setCompletionSummary({
        durationSeconds: Math.round(completionDurationSeconds),
        distanceMeters: telemetry.distanceMeters,
      })
      setCompletionDialogOpen(true)
      setShowConfetti(true)
    }
    previousIsComplete.current = workoutState.isComplete
  }, [
    completionDurationSeconds,
    telemetry.distanceMeters,
    workoutState.isComplete,
  ])

  return (
    <div className="relative flex min-h-full w-full flex-1 flex-col gap-5 px-0 py-2 sm:gap-6">
      {showConfetti && (
        <Confetti
          width={viewportSize.width}
          height={viewportSize.height}
          recycle={false}
          numberOfPieces={240}
          gravity={0.25}
          tweenDuration={5000}
          onConfettiComplete={() => setShowConfetti(false)}
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 60,
          }}
        />
      )}
      {completionSummary && (
        <WorkoutCompleteDialog
          open={completionDialogOpen}
          workoutId={workout._id}
          workoutTitle={workout.title}
          summary={completionSummary}
          onOpenChange={setCompletionDialogOpen}
        />
      )}
      {showDisconnectedOverlay && onReconnect && (
        <DisconnectedOverlay
          onReconnect={onReconnect}
          onEnd={onEnd}
          errorCopy={getDisconnectErrorCopy(lastTrainerErrorCode)}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[0.65rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              {workoutState.isComplete ? "Complete" : "Now riding"}
            </span>
            {showStaleBadge && <TelemetryStaleBadge />}
          </div>
          <h2 className="mt-1 truncate font-heading text-lg font-semibold tracking-tight sm:text-xl">
            {workout.title}
          </h2>
        </div>
      </div>

      <div className="grid flex-1 content-center gap-7 md:grid-cols-3 md:gap-8 xl:gap-10">
        <RidePowerModule
          targetWatts={workoutState.targetWatts}
          powerWatts={telemetry.powerWatts}
          telemetrySource={telemetry.telemetrySource}
          telemetryStatus={telemetry.telemetryStatus}
        />
        <div className="relative min-w-0 overflow-hidden border-l-2 border-muted pl-4 sm:pl-6">
          <div
            aria-hidden="true"
            className={
              intervalWarning
                ? "absolute top-0 left-0 w-1 bg-destructive"
                : "absolute top-0 left-0 w-1 bg-primary"
            }
            style={{ height: `${intervalProgressPercent}%` }}
          />
          <RideDashboardMetric
            label={
              workoutState.activeSegmentIndex === null
                ? workoutState.isComplete
                  ? "Workout complete"
                  : "Current interval"
                : `Segment ${workoutState.activeSegmentIndex + 1}`
            }
            value={formatDuration(Math.ceil(intervalRemainingSeconds))}
            tone={intervalWarning ? "danger" : "default"}
            valueClassName="text-6xl md:text-7xl xl:text-8xl"
            testId="current-interval-timer"
          />
        </div>
        <RideHeartCadenceModule
          heartRateBpm={telemetry.heartRateBpm}
          cadenceRpm={telemetry.cadenceRpm}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,0.45fr)_minmax(0,1fr)_minmax(13rem,0.55fr)]">
        <RideDashboardMetric
          label="Workout remaining"
          value={formatDuration(Math.ceil(workoutRemainingSeconds))}
          valueSuffix={formatDuration(totalDurationSeconds)}
          testId="workout-remaining-timer"
        />
        <IntervalComment comment={currentComment} />
        <DifficultyControl
          difficultyPercent={workoutState.difficultyPercent}
          minPercent={MIN_DIFFICULTY_PERCENT}
          maxPercent={MAX_DIFFICULTY_PERCENT}
          onDecrease={() => {
            void onDifficultyChange(workoutState.difficultyPercent - 1)
          }}
          onIncrease={() => {
            void onDifficultyChange(workoutState.difficultyPercent + 1)
          }}
          onReset={() => {
            void onDifficultyReset()
          }}
        />
      </div>

      <WorkoutProgressOverview
        intervals={workout.intervals}
        elapsedSeconds={elapsedSeconds}
        totalDurationSeconds={totalDurationSeconds}
        activeSegmentIndex={workoutState.activeSegmentIndex}
        completedIntervalCount={completedIntervalCount}
        paused={paused}
        isComplete={workoutState.isComplete}
        onPause={onPause}
        onResume={onResume}
        onStop={onEnd}
        onSeek={handleSeek}
        stopDialogOpen={stopDialogOpen}
        onStopDialogOpenChange={setStopDialogOpen}
      />
    </div>
  )
}
