import { useEffect, useRef, useState } from "react"
import { useRideSelector, useRideThrottledSelector } from "@ramp/ride-react"
import { RampTestResultDialog } from "../ramp-test-result-dialog"
import type { RampPhase } from "../../ramp-protocol"
import type { WorkoutSessionState } from "@ramp/ride-workouts"
import type { Interval } from "@/lib/workout-utils"
import type {
  ActivityExperienceAPI,
  ActivityResumeStateInput,
  ActivitySummaryInput,
} from "@/components/activity/types"
import type { ExperienceSessionAPI } from "@/ride/experience-session"
import {
  getCompletedIntervalCount,
  getIntervalBounds,
  getIntervalRemainingSeconds,
  getTotalDurationSeconds,
  getWorkoutRemainingSeconds,
} from "@/experiences/live-workout/components/live-workout-dashboard/utils"
import { useWorkoutKeypresses } from "@/experiences/live-workout/components/live-workout-dashboard/use-workout-keypresses"
import { WorkoutProgressOverview } from "@/experiences/live-workout/components/live-workout-dashboard/components/workout-progress-overview"
import { TelemetryStaleBadge } from "@/experiences/live-workout/components/live-workout-dashboard/components/telemetry-stale-badge"
import { DisconnectedOverlay } from "@/experiences/live-workout/components/live-workout-dashboard/components/disconnected-overlay"
import { EndActivityDialog } from "@/components/activity/end-activity-dialog"
import { SaveActivityDialog } from "@/components/activity/save-activity-dialog"
import { formatActivityDuration } from "@/components/activity/format"
import {
  RideDashboardMetric,
  RideHeartCadenceModule,
  RidePowerModule,
} from "@/components/ride/ride-dashboard"
import { Badge } from "@/components/ui/badge"
import { formatDuration, getAveragePower } from "@/lib/workout-utils"
import { useUnitFormatters } from "@/hooks/use-unit-formatters"

const PHASE_LABELS: Record<RampPhase, string> = {
  warmup: "Warmup",
  ramp: "Ramp",
  cooldown: "Cooldown",
}

type RampTestDashboardProps = {
  title: string
  intervals: Array<Interval>
  ftp: number
  session: ExperienceSessionAPI
  workoutState: WorkoutSessionState
  phase: RampPhase
  calculatedFtp: number | null
  failed: boolean
  onEnd: () => void
  onReconnect?: () => void
  onPause?: () => void
  onResume?: () => void
  onSeek?: (elapsedSeconds: number) => void | Promise<void>
  activity?: ActivityExperienceAPI
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

export function RampTestDashboard({
  title,
  intervals,
  ftp,
  session,
  workoutState,
  phase,
  calculatedFtp,
  failed,
  onEnd,
  onReconnect,
  onPause,
  onResume,
  onSeek,
  activity,
}: RampTestDashboardProps) {
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
  const units = useUnitFormatters()
  const hasPausedForDisconnect = useRef(false)
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [activityBusy, setActivityBusy] = useState(false)
  const capturedResultHandled = useRef(false)

  const { stopDialogOpen, setStopDialogOpen } = useWorkoutKeypresses({
    difficultyPercent: 100,
    isComplete: workoutState.isComplete,
    paused,
    onDifficultyChange: () => undefined,
    onPause,
    onResume,
  })

  // Auto-pause when the trainer disconnects.
  useEffect(() => {
    if (!trainerConnected && !paused && !hasPausedForDisconnect.current) {
      hasPausedForDisconnect.current = true
      onPause?.()
    } else if (trainerConnected && hasPausedForDisconnect.current) {
      hasPausedForDisconnect.current = false
      onResume?.()
    }
  }, [paused, trainerConnected, onPause, onResume])

  // Surface the result dialog as soon as FTP is captured (failure or finish).
  useEffect(() => {
    if (calculatedFtp !== null && !capturedResultHandled.current) {
      capturedResultHandled.current = true
      setResultDialogOpen(true)
    }
  }, [calculatedFtp])

  const showDisconnectedOverlay =
    !trainerConnected && workoutState.isActive && !workoutState.isComplete
  const showStaleBadge =
    telemetryStatus === "stale" && trainerConnected && !workoutState.isComplete

  const totalDurationSeconds = getTotalDurationSeconds(
    workoutState.totalDurationSeconds,
    intervals
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
    intervals,
    workoutState.activeSegmentIndex
  )
  const intervalRemainingSeconds = getIntervalRemainingSeconds(
    intervalBounds,
    elapsedSeconds
  )
  const completedIntervalCount = getCompletedIntervalCount(
    intervals,
    elapsedSeconds,
    workoutState.isComplete
  )

  const buildActivitySummary = (): ActivitySummaryInput => {
    const completionPercent =
      totalDurationSeconds > 0
        ? Math.min(100, (elapsedSeconds / totalDurationSeconds) * 100)
        : 0
    return {
      durationSeconds: Math.round(completionDurationSeconds),
      distanceMeters: telemetry.distanceMeters,
      plannedAverageWatts: Math.round(getAveragePower(intervals)),
      completionPercent: workoutState.isComplete ? 100 : completionPercent,
    }
  }

  const buildResumeState = (): ActivityResumeStateInput => ({
    kind: "ramp-test",
    elapsedSeconds: Math.round(elapsedSeconds),
    difficultyPercent: 100,
  })

  const activityMetrics = [
    {
      label: "Time",
      value: formatActivityDuration(buildActivitySummary().durationSeconds),
    },
    {
      label: "Distance",
      value: units.distance(buildActivitySummary().distanceMeters),
    },
  ]

  const handleRequestEnd = () => {
    session.pause()
    setStopDialogOpen(true)
  }

  const handleContinueFromResult = async () => {
    if (!activity) {
      setResultDialogOpen(false)
      onEnd()
      return
    }
    setActivityBusy(true)
    try {
      await activity.markPending({
        summary: buildActivitySummary(),
        resumeState: buildResumeState(),
      })
      setResultDialogOpen(false)
      setSaveDialogOpen(true)
    } finally {
      setActivityBusy(false)
    }
  }

  const handleSaveFromStop = async () => {
    if (!activity) {
      onEnd()
      return
    }
    setActivityBusy(true)
    try {
      await activity.markPending({
        summary: buildActivitySummary(),
        resumeState: buildResumeState(),
      })
      setStopDialogOpen(false)
      setSaveDialogOpen(true)
    } finally {
      setActivityBusy(false)
    }
  }

  const handleCompleteLater = async () => {
    if (!activity) {
      onEnd()
      return
    }
    setActivityBusy(true)
    try {
      await activity.saveProgress({
        summary: buildActivitySummary(),
        resumeState: buildResumeState(),
      })
      setStopDialogOpen(false)
      onEnd()
    } finally {
      setActivityBusy(false)
    }
  }

  const handleDiscardActivity = async () => {
    setActivityBusy(true)
    try {
      await activity?.discard()
      setStopDialogOpen(false)
      setSaveDialogOpen(false)
      setResultDialogOpen(false)
      onEnd()
    } finally {
      setActivityBusy(false)
    }
  }

  const handleCompleteActivity = async (activityTitle: string) => {
    if (!activity) {
      onEnd()
      return
    }
    setActivityBusy(true)
    try {
      await activity.complete({
        title: activityTitle,
        summary: buildActivitySummary(),
        resumeState: buildResumeState(),
        resultFtp: calculatedFtp,
      })
      setSaveDialogOpen(false)
      onEnd()
    } finally {
      setActivityBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-full w-full flex-1 flex-col gap-5 px-0 py-2 sm:gap-6">
      <RampTestResultDialog
        open={resultDialogOpen}
        calculatedFtp={calculatedFtp}
        currentFtp={ftp}
        failed={failed}
        busy={activityBusy}
        onOpenChange={setResultDialogOpen}
        onContinue={handleContinueFromResult}
      />
      <EndActivityDialog
        open={stopDialogOpen}
        title="End ramp test?"
        description="Save this ramp test now, keep it for later, or discard it."
        metrics={activityMetrics}
        busy={activityBusy}
        onOpenChange={setStopDialogOpen}
        onSaveActivity={handleSaveFromStop}
        onCompleteLater={handleCompleteLater}
        onDiscard={handleDiscardActivity}
      />
      <SaveActivityDialog
        open={saveDialogOpen}
        defaultTitle={title}
        description="Review the activity title before saving it to history."
        metrics={activityMetrics}
        saving={activityBusy}
        discarding={activityBusy}
        onOpenChange={setSaveDialogOpen}
        onSave={handleCompleteActivity}
        onDiscard={handleDiscardActivity}
      />
      {showDisconnectedOverlay && onReconnect && (
        <DisconnectedOverlay
          onReconnect={onReconnect}
          onEnd={handleRequestEnd}
          errorCopy={getDisconnectErrorCopy(lastTrainerErrorCode)}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[0.65rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              {workoutState.isComplete ? "Complete" : "Ramp test"}
            </span>
            {showStaleBadge && <TelemetryStaleBadge />}
          </div>
          <h2 className="mt-1 truncate font-heading text-lg font-semibold tracking-tight sm:text-xl">
            {title}
          </h2>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {PHASE_LABELS[phase]}
        </Badge>
      </div>

      <div className="grid flex-1 content-center gap-7 md:grid-cols-3 md:gap-8 xl:gap-10">
        <RidePowerModule
          targetWatts={workoutState.targetWatts}
          powerWatts={telemetry.powerWatts}
          telemetrySource={telemetry.telemetrySource}
          telemetryStatus={telemetry.telemetryStatus}
        />
        <div className="min-w-0 border-l-2 border-muted pl-4 sm:pl-6">
          <RideDashboardMetric
            label={
              workoutState.isComplete
                ? "Ramp test complete"
                : `Step time · ${PHASE_LABELS[phase]}`
            }
            value={formatDuration(Math.ceil(intervalRemainingSeconds))}
            valueClassName="text-6xl md:text-7xl xl:text-8xl"
            testId="ramp-step-timer"
          />
        </div>
        <RideHeartCadenceModule
          heartRateBpm={telemetry.heartRateBpm}
          cadenceRpm={telemetry.cadenceRpm}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <RideDashboardMetric
          label="Test remaining"
          value={formatDuration(Math.ceil(workoutRemainingSeconds))}
          valueSuffix={formatDuration(totalDurationSeconds)}
          testId="ramp-remaining-timer"
        />
        <RideDashboardMetric
          label="Target power"
          value={
            workoutState.targetWatts !== null
              ? `${workoutState.targetWatts}W`
              : "--"
          }
          testId="ramp-target-power"
        />
      </div>

      <WorkoutProgressOverview
        intervals={intervals}
        ftp={ftp}
        elapsedSeconds={elapsedSeconds}
        totalDurationSeconds={totalDurationSeconds}
        activeSegmentIndex={workoutState.activeSegmentIndex}
        completedIntervalCount={completedIntervalCount}
        paused={paused}
        isComplete={workoutState.isComplete}
        onPause={onPause}
        onResume={onResume}
        onStop={handleRequestEnd}
        onSeek={onSeek}
        stopDialogOpen={stopDialogOpen}
        onStopDialogOpenChange={setStopDialogOpen}
      />
    </div>
  )
}
