import { useEffect, useMemo, useRef } from "react"
import { Gauge, Square, Timer, Zap } from "lucide-react"
import { Stat } from "./components/stat"
import { UpcomingPreview } from "./components/upcoming-preview"
import { DisconnectedOverlay } from "./components/disconnected-overlay"
import { TelemetryStaleBadge } from "./components/telemetry-stale-badge"
import type { WorkoutSessionState } from "@ramp/ride-workouts"
import type { RideSessionState } from "@ramp/ride-core"
import type { ClientWorkoutDoc } from "@/ride/convex-workout-mapper"
import type { UpcomingPreviewItem } from "./components/upcoming-preview"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress"
import { WorkoutMini } from "@/components/workout-mini"
import { formatDuration, percentageToWatts } from "@/lib/workout-utils"

type LiveWorkoutDashboardProps = {
  ftp: number
  onEnd: () => void
  onReconnect?: () => void
  onPause?: () => void
  onResume?: () => void
  sessionState?: RideSessionState
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

export function LiveWorkoutDashboard({
  ftp,
  onEnd,
  onReconnect,
  onPause,
  onResume,
  sessionState,
  workout,
  workoutState,
}: LiveWorkoutDashboardProps) {
  const trainerConnected = sessionState?.trainerConnected ?? true
  const telemetryStatus = sessionState?.telemetry.telemetryStatus ?? "fresh"
  const lastTrainerErrorCode = sessionState?.lastTrainerError?.code
  const hasPausedForDisconnect = useRef(false)

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

  const totalDurationSeconds =
    workoutState.totalDurationSeconds ||
    workout.intervals.reduce((sum, i) => sum + i.durationSeconds, 0)

  const elapsedSeconds = Math.max(
    0,
    Math.min(workoutState.elapsedSeconds, totalDurationSeconds)
  )
  const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds)
  const progress =
    totalDurationSeconds > 0
      ? Math.min(100, (elapsedSeconds / totalDurationSeconds) * 100)
      : 0

  const upcoming = useMemo<UpcomingPreviewItem | null>(() => {
    const idx = workoutState.activeSegmentIndex
    if (idx === null) return null
    if (idx + 1 >= workout.intervals.length) return null
    const next = workout.intervals[idx + 1]
    const avgPower = (next.startPower + next.endPower) / 2
    return {
      label: next.comment?.trim() || `Segment ${idx + 2}`,
      durationSeconds: next.durationSeconds,
      targetWatts: percentageToWatts(avgPower, ftp),
    }
  }, [ftp, workout.intervals, workoutState.activeSegmentIndex])

  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4">
      {showDisconnectedOverlay && onReconnect && (
        <DisconnectedOverlay
          onReconnect={onReconnect}
          onEnd={onEnd}
          errorCopy={getDisconnectErrorCopy(lastTrainerErrorCode)}
        />
      )}
      <Card size="sm" className="bg-background/85 shadow-xl backdrop-blur-md">
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[0.65rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  {workoutState.isComplete ? "Complete" : "Now riding"}
                </span>
                {showStaleBadge && <TelemetryStaleBadge />}
              </div>
              <h2 className="font-heading text-xl font-semibold tracking-tight">
                {workout.title}
              </h2>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={onEnd}
              size="sm"
            >
              <Square data-icon="inline-start" />
              End workout
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat
              icon={<Zap className="size-4" />}
              label="Target"
              value={
                workoutState.targetWatts !== null
                  ? `${workoutState.targetWatts} W`
                  : "-"
              }
              accent={workoutState.targetWatts !== null}
            />
            <Stat
              icon={<Timer className="size-4" />}
              label="Elapsed"
              value={formatDuration(Math.floor(elapsedSeconds))}
            />
            <Stat
              icon={<Gauge className="size-4" />}
              label="Remaining"
              value={formatDuration(Math.ceil(remainingSeconds))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[0.7rem] font-medium text-muted-foreground">
              <span className="truncate">
                {workoutState.activeSegmentLabel ??
                  (workoutState.isComplete
                    ? "Workout complete"
                    : "Loading segment...")}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress}>
              <ProgressTrack>
                <ProgressIndicator />
              </ProgressTrack>
            </Progress>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="bg-background/80 shadow-md backdrop-blur-md">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading text-sm font-semibold tracking-tight">
              Workout overview
            </h3>
            <span className="text-[0.65rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              {workout.intervals.length} intervals
            </span>
          </div>
          <div className="rounded-3xl border bg-background/60 px-3 pt-3">
            <WorkoutMini intervals={workout.intervals} className="h-20" />
          </div>
          <UpcomingPreview
            isComplete={workoutState.isComplete}
            upcoming={upcoming}
          />
        </CardContent>
      </Card>
    </div>
  )
}
