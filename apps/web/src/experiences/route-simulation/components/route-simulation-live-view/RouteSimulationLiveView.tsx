import { useEffect, useRef, useState } from "react"
import Confetti from "react-confetti"
import { useRideSelector } from "@ramp/ride-react"
import { useViewportSize } from "../../hooks/use-viewport-size"
import { RouteCompleteDialog } from "../route-complete-dialog"
import { RouteDisconnectedOverlay } from "../route-disconnected-overlay"
import { RouteElevationMinimap } from "../route-elevation-minimap"
import { RouteMiniMap } from "../route-mini-map"
import { RouteRideHud } from "../route-ride-hud"
import { RouteSimulationMap } from "../route-simulation-map"
import type { ParsedRouteGpx } from "@/lib/routes/types"
import type {
  ActivityExperienceAPI,
  ActivityResumeStateInput,
  ActivitySummaryInput,
} from "@/components/activity/types"
import type { RideExperienceConnection } from "@/ride/experience-runtime"
import type { RideSessionController } from "@ramp/ride-core"
import type {
  RouteProgressMode,
  RouteSimulationRideController,
} from "../../types"
import { EndActivityDialog } from "@/components/activity/end-activity-dialog"
import { SaveActivityDialog } from "@/components/activity/save-activity-dialog"
import {
  formatActivityDuration,
} from "@/components/activity/format"
import { useUnitFormatters } from "@/hooks/use-unit-formatters"

type RouteSimulationLiveViewProps = {
  activeRouteTitle: string | null
  activity?: ActivityExperienceAPI
  connection?: RideExperienceConnection
  ride: RouteSimulationRideController
  route: ParsedRouteGpx
  progressMode: RouteProgressMode
  session: RideSessionController
}

export const RouteSimulationLiveView = ({
  activeRouteTitle,
  activity,
  connection,
  ride,
  route,
  progressMode,
  session,
}: RouteSimulationLiveViewProps) => {
  const paused = useRideSelector(session, (s) => s.paused)
  const telemetryStatus = useRideSelector(
    session,
    (s) => s.telemetry.telemetryStatus
  )
  const powerWatts = useRideSelector(session, (s) => s.telemetry.powerWatts)
  const trainerConnected = useRideSelector(session, (s) => s.trainerConnected)
  const viewportSize = useViewportSize()
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [activityBusy, setActivityBusy] = useState(false)
  const pendingMarkedComplete = useRef(false)
  const units = useUnitFormatters()

  const buildActivitySummary = (): ActivitySummaryInput => ({
    durationSeconds: Math.round(ride.elapsedSeconds),
    distanceMeters: ride.isComplete
      ? route.stats.distanceMeters
      : Math.round(ride.distanceMeters),
    elevationGainMeters: ride.isComplete
      ? route.stats.elevationGainMeters
      : Math.round(
          route.stats.elevationGainMeters *
            Math.min(
              1,
              ride.distanceMeters / Math.max(route.stats.distanceMeters, 1)
            )
        ),
    elevationLossMeters: ride.isComplete
      ? route.stats.elevationLossMeters
      : Math.round(
          route.stats.elevationLossMeters *
            Math.min(
              1,
              ride.distanceMeters / Math.max(route.stats.distanceMeters, 1)
            )
        ),
    completionPercent:
      route.stats.distanceMeters > 0
        ? Math.min(
            100,
            (ride.distanceMeters / route.stats.distanceMeters) * 100
          )
        : 0,
  })

  const buildResumeState = (): ActivityResumeStateInput => ({
    kind: "route",
    elapsedSeconds: Math.round(ride.elapsedSeconds),
    distanceMeters: Math.round(ride.distanceMeters),
    progressMode,
    smoothingLevel: ride.smoothingLevel,
  })

  const activitySummary = buildActivitySummary()
  const activityMetrics = [
    {
      label: "Time",
      value: formatActivityDuration(activitySummary.durationSeconds),
    },
    {
      label: "Distance",
      value: units.distance(activitySummary.distanceMeters),
    },
    {
      label: "Climb",
      value: units.elevation(activitySummary.elevationGainMeters),
    },
    {
      label: "Complete",
      value: `${Math.round(activitySummary.completionPercent ?? 0)}%`,
    },
  ]

  useEffect(() => {
    if (!activity || !ride.isComplete || pendingMarkedComplete.current) return
    pendingMarkedComplete.current = true
    void activity
      .markPending({
        summary: buildActivitySummary(),
        resumeState: buildResumeState(),
      })
      .then(() => setSaveDialogOpen(true))
  }, [activity, ride.isComplete])

  const handleSaveActivity = async () => {
    if (!activity) {
      await ride.handleStop()
      return
    }
    setActivityBusy(true)
    try {
      await activity.markPending({
        summary: buildActivitySummary(),
        resumeState: buildResumeState(),
      })
      setEndDialogOpen(false)
      setSaveDialogOpen(true)
    } finally {
      setActivityBusy(false)
    }
  }

  const handleCompleteLater = async () => {
    if (!activity) {
      await ride.handleStop()
      return
    }
    setActivityBusy(true)
    try {
      await activity.saveProgress({
        summary: buildActivitySummary(),
        resumeState: buildResumeState(),
      })
      setEndDialogOpen(false)
      await ride.handleStop()
    } finally {
      setActivityBusy(false)
    }
  }

  const handleDiscardActivity = async () => {
    setActivityBusy(true)
    try {
      await activity?.discard()
      setEndDialogOpen(false)
      setSaveDialogOpen(false)
      await ride.handleStop()
    } finally {
      setActivityBusy(false)
    }
  }

  const handleCompleteActivity = async (title: string) => {
    if (!activity) return
    setActivityBusy(true)
    try {
      await activity.complete({
        title,
        summary: buildActivitySummary(),
        resumeState: buildResumeState(),
      })
      setSaveDialogOpen(false)
      await ride.handleStop()
    } finally {
      setActivityBusy(false)
    }
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      {ride.showConfetti && (
        <Confetti
          width={viewportSize.width}
          height={viewportSize.height}
          recycle={false}
          numberOfPieces={240}
          gravity={0.25}
          tweenDuration={5000}
          onConfettiComplete={() => ride.setShowConfetti(false)}
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 60,
          }}
        />
      )}
      <RouteSimulationMap
        follow={ride.isActive && !paused}
        onRouteClick={ride.handleRouteClick}
        presentation={ride.mapPresentation}
        riderDistanceMeters={ride.distanceMeters}
        riderGradePercent={ride.displayGradePercent}
        riderPosition={ride.riderPosition}
        route={route}
      />
      <RouteMiniMap
        onRouteClick={ride.handleRouteClick}
        riderDistanceMeters={ride.distanceMeters}
        riderPosition={ride.riderPosition}
        route={route}
      />
      <RouteElevationMinimap
        distanceMeters={ride.distanceMeters}
        riderElevationMeters={ride.riderPosition?.elevationMeters ?? null}
        samples={route.elevationSamples}
        totalDistanceMeters={route.stats.distanceMeters}
      />
      <RouteRideHud
        distanceMeters={ride.distanceMeters}
        elapsedSeconds={ride.elapsedSeconds}
        gradeDiagnostics={ride.debug.gradeDiagnostics}
        gradePercent={ride.displayGradePercent}
        isComplete={ride.isComplete}
        isPaused={paused}
        lastGradeDispatch={ride.debug.lastGradeDispatch}
        onPause={ride.handlePause}
        onResume={ride.handleResume}
        onRestart={ride.handleRestart}
        onSmoothingChange={ride.setSmoothingLevel}
        onStop={() => setEndDialogOpen(true)}
        onTerrainEnabledChange={(terrainEnabled) =>
          ride.setMapPresentation((current) => ({ ...current, terrainEnabled }))
        }
        onViewModeChange={(viewMode) =>
          ride.setMapPresentation((current) => ({ ...current, viewMode }))
        }
        powerWatts={powerWatts}
        riderPosition={ride.riderPosition}
        smoothingLevel={ride.smoothingLevel}
        speedKph={ride.speedKph}
        speedSource={ride.speedSource}
        terrainEnabled={ride.mapPresentation.terrainEnabled}
        telemetryStatus={telemetryStatus}
        totalDistanceMeters={route.stats.distanceMeters}
        viewMode={ride.mapPresentation.viewMode}
      />
      {activity ? null : (
        <RouteCompleteDialog
          distanceMeters={route.stats.distanceMeters}
          elapsedSeconds={ride.elapsedSeconds}
          onOpenChange={ride.setCompletionDialogOpen}
          onRestart={ride.handleRestart}
          open={ride.completionDialogOpen}
          routeTitle={activeRouteTitle ?? route.title}
        />
      )}
      <EndActivityDialog
        open={endDialogOpen}
        title="End route ride?"
        description="Save this ride now, keep it for later, or discard it."
        metrics={activityMetrics}
        busy={activityBusy}
        onOpenChange={setEndDialogOpen}
        onSaveActivity={handleSaveActivity}
        onCompleteLater={handleCompleteLater}
        onDiscard={handleDiscardActivity}
      />
      <SaveActivityDialog
        open={saveDialogOpen}
        defaultTitle={activeRouteTitle ?? route.title}
        description="Review the activity title before saving it to history."
        metrics={activityMetrics}
        saving={activityBusy}
        discarding={activityBusy}
        onOpenChange={setSaveDialogOpen}
        onSave={handleCompleteActivity}
        onDiscard={handleDiscardActivity}
      />
      {!trainerConnected && ride.isActive && (
        <RouteDisconnectedOverlay
          onReconnect={connection?.reconnect}
          onStop={() => {
            void ride.handleStop()
          }}
        />
      )}
    </div>
  )
}
