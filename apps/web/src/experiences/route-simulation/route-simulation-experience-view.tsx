import { useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Capability } from "@ramp/ride-core"
import { useRideSelector } from "@ramp/ride-react"
import { RouteSimulationLiveView } from "./components/route-simulation-live-view"
import { RouteSimulationSetup } from "./components/route-simulation-setup"
import { useRouteSimulationRide } from "./hooks/use-route-simulation-ride"
import { useRouteSimulationRoute } from "./hooks/use-route-simulation-route"
import { useRouteSimulationPreferences } from "./hooks/use-route-simulation-preferences"
import type { RideExperienceConnection } from "@/ride/experience-runtime"
import type { ExperienceSessionAPI } from "@/ride/experience-session"
import type { Id } from "#convex/_generated/dataModel"
import type { RouteProgressMode } from "./types"

type RouteSimulationExperienceViewProps = {
  connection?: RideExperienceConnection
  search?: {
    routeId?: string
  }
  session: ExperienceSessionAPI
}

export function RouteSimulationExperienceView({
  connection,
  search,
  session,
}: RouteSimulationExperienceViewProps) {
  const navigate = useNavigate({ from: "/ride/$experienceId" })
  const linkedRouteId = search?.routeId as Id<"routes"> | undefined
  const trainerConnected = useRideSelector(session, (s) => s.trainerConnected)
  const supportsSimulation = session.controls
    .getCapabilities()
    .has(Capability.SimulationGrade)

  const route = useRouteSimulationRoute({ linkedRouteId, navigate })
  const preferences = useRouteSimulationPreferences()
  const ride = useRouteSimulationRide({
    parsedRoute: route.parsedRoute,
    physicsConfig: preferences.physicsConfig,
    progressMode: preferences.progressMode,
    session,
    supportsSimulation,
    trainerConnected,
  })

  const handleSelectRoute = useCallback(
    (routeId: Id<"routes">) => {
      ride.resetRideStateForRouteChange()
      route.handleSelectRoute(routeId)
    },
    [ride, route]
  )

  const handleChangeRoute = useCallback(() => {
    ride.resetRideStateForRouteChange()
    route.handleChangeRoute()
  }, [ride, route])

  const handleProgressModeChange = useCallback(
    (mode: RouteProgressMode) => {
      ride.resetSeekTransition()
      preferences.handleProgressModeChange(mode)
    },
    [ride, preferences]
  )

  const startDisabledReason = !route.parsedRoute
    ? "Choose a valid GPX route."
    : !trainerConnected
      ? "Connect a trainer before starting."
      : !supportsSimulation
        ? "Connected trainer does not support simulation grade."
        : preferences.progressMode === "app-physics" && !preferences.physicsConfig
          ? "Loading physics profile."
          : null

  if (!ride.isActive && !ride.isComplete) {
    return (
      <RouteSimulationSetup
        onChangeRoute={handleChangeRoute}
        onProgressModeChange={handleProgressModeChange}
        onSelectRoute={handleSelectRoute}
        onStart={ride.handleStart}
        route={route}
        preferences={preferences}
        startDisabledReason={startDisabledReason}
      />
    )
  }

  return route.parsedRoute ? (
    <RouteSimulationLiveView
      activeRouteTitle={route.activeRouteTitle}
      connection={connection}
      ride={ride}
      route={route.parsedRoute}
      session={session}
    />
  ) : null
}
