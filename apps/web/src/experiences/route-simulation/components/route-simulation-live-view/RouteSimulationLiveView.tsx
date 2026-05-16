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
import type { RideExperienceConnection } from "@/ride/experience-runtime"
import type { ExperienceSessionAPI } from "@/ride/experience-session"
import type { RouteSimulationRideController } from "../../types"

type RouteSimulationLiveViewProps = {
  activeRouteTitle: string | null
  connection?: RideExperienceConnection
  ride: RouteSimulationRideController
  route: ParsedRouteGpx
  session: ExperienceSessionAPI
}

export const RouteSimulationLiveView = ({
  activeRouteTitle,
  connection,
  ride,
  route,
  session,
}: RouteSimulationLiveViewProps) => {
  const paused = useRideSelector(session, (s) => s.paused)
  const telemetryStatus = useRideSelector(
    session,
    (s) => s.telemetry.telemetryStatus
  )
  const trainerConnected = useRideSelector(session, (s) => s.trainerConnected)
  const viewportSize = useViewportSize()

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
        riderGradePercent={ride.displayGradePercent}
        riderPosition={ride.riderPosition}
        route={route}
      />
      <RouteMiniMap
        onRouteClick={ride.handleRouteClick}
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
        gradePercent={ride.displayGradePercent}
        isPaused={paused}
        onPause={ride.handlePause}
        onResume={ride.handleResume}
        onSmoothingChange={ride.setSmoothingLevel}
        onStop={ride.handleStop}
        onTerrainEnabledChange={(terrainEnabled) =>
          ride.setMapPresentation((current) => ({ ...current, terrainEnabled }))
        }
        onViewModeChange={(viewMode) =>
          ride.setMapPresentation((current) => ({ ...current, viewMode }))
        }
        smoothingLevel={ride.smoothingLevel}
        speedKph={ride.speedKph}
        speedSource={ride.speedSource}
        terrainEnabled={ride.mapPresentation.terrainEnabled}
        telemetryStatus={telemetryStatus}
        totalDistanceMeters={route.stats.distanceMeters}
        viewMode={ride.mapPresentation.viewMode}
      />
      <RouteCompleteDialog
        distanceMeters={route.stats.distanceMeters}
        elapsedSeconds={ride.elapsedSeconds}
        onOpenChange={ride.setCompletionDialogOpen}
        open={ride.completionDialogOpen}
        routeTitle={activeRouteTitle ?? route.title}
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
