import { useEffect, useRef, useState } from "react"
import Confetti from "react-confetti"
import { useRideHeartbeat, useRideSelector } from "@ramp/ride-core"
import { DisconnectedOverlay } from "./components/disconnected-overlay"
import { IntervalComment } from "./components/interval-comment"
import { PowerModule } from "./components/power-module"
import { RideMetric } from "./components/ride-metric"
import { TelemetryStaleBadge } from "./components/telemetry-stale-badge"
import {
  WorkoutCompleteDialog,
  type WorkoutCompletionSummary,
} from "./components/workout-complete-dialog"
import { WorkoutProgressOverview } from "./components/workout-progress-overview"
import {
  getCompletedIntervalCount,
  getIntervalBounds,
  getIntervalProgressPercent,
  getIntervalRemainingSeconds,
  getTotalDurationSeconds,
  getWorkoutRemainingSeconds,
} from "./utils"
import type { RideSessionController } from "@ramp/ride-core"
import type { WorkoutSessionState } from "@ramp/ride-workouts"
import type { ClientWorkoutDoc } from "@/ride/convex-workout-mapper"
import { formatDuration } from "@/lib/workout-utils"

type LiveWorkoutDashboardProps = {
  onEnd: () => void
  onReconnect?: () => void
  onPause?: () => void
  onResume?: () => void
  onSeek: (elapsedSeconds: number) => void | Promise<void>
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
  session,
  workout,
  workoutState,
}: LiveWorkoutDashboardProps) {
  const trainerConnected = useRideSelector(session, (s) => s.trainerConnected)
  const telemetryStatus = useRideSelector(
    session,
    (s) => s.telemetry.telemetryStatus
  )
  const telemetry = useRideSelector(session, (s) => s.telemetry)
  const paused = useRideSelector(session, (s) => s.paused)
  const lastTrainerErrorCode = useRideSelector(
    session,
    (s) => s.lastTrainerError?.code
  )
  const viewportSize = useViewportSize()
  // Ensure at-minimum 1 Hz re-renders for time displays
  useRideHeartbeat(session, 1)
  const hasPausedForDisconnect = useRef(false)
  const previousIsComplete = useRef(workoutState.isComplete)
  const [completionSummary, setCompletionSummary] =
    useState<WorkoutCompletionSummary | null>(null)
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // Auto-pause when trainer disconnects
  useEffect(() => {
    if (!trainerConnected && !hasPausedForDisconnect.current) {
      hasPausedForDisconnect.current = true
      onPause?.()
    } else if (trainerConnected && hasPausedForDisconnect.current) {
      hasPausedForDisconnect.current = false
      onResume?.()
    }
  }, [trainerConnected, onPause, onResume])

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
          <h2 className="font-heading mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl">
            {workout.title}
          </h2>
        </div>
      </div>

      <div className="grid flex-1 content-center gap-7 md:grid-cols-3 md:gap-8 xl:gap-10">
        <PowerModule
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
          <RideMetric
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
        <div className="flex min-w-0 flex-col gap-5">
          <div className="min-w-0">
            <div className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Heart rate
            </div>
            <div
              className={
                telemetry.heartRateBpm !== null
                  ? "font-heading mt-2 truncate text-6xl leading-none font-semibold tabular-nums md:text-7xl xl:text-8xl"
                  : "mt-2 truncate text-base font-medium text-muted-foreground md:text-lg"
              }
            >
              {telemetry.heartRateBpm !== null
                ? `${Math.round(telemetry.heartRateBpm)} bpm`
                : "Not connected"}
            </div>
          </div>
          <RideMetric
            label="Cadence"
            value={
              telemetry.cadenceRpm !== null
                ? `${Math.round(telemetry.cadenceRpm)} rpm`
                : "-- rpm"
            }
            tone={telemetry.cadenceRpm === null ? "muted" : "default"}
            valueClassName="text-4xl md:text-5xl xl:text-6xl"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,0.45fr)_minmax(0,1fr)]">
        <RideMetric
          label="Workout remaining"
          value={formatDuration(Math.ceil(workoutRemainingSeconds))}
          valueSuffix={formatDuration(totalDurationSeconds)}
          testId="workout-remaining-timer"
        />
        <IntervalComment comment={currentComment} />
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
        onSeek={onSeek}
      />
    </div>
  )
}
