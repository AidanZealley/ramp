import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Confetti from "react-confetti"
import { useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { Capability } from "@ramp/ride-core"
import { useRideFrame, useRideSelector } from "@ramp/ride-react"
import type { Id } from "#convex/_generated/dataModel"
import { api } from "#convex/_generated/api"
import type { ExperienceSessionAPI } from "@/ride/experience-session"
import type { RideExperienceConnection } from "@/ride/experience-runtime"
import { parseRouteGpxText } from "@/lib/routes/gpx"
import type { ParsedRouteGpx, RoutePosition } from "@/lib/routes/types"
import {
  computeRouteGradePercent,
  findNearestRouteDistanceMeters,
  interpolateRoutePointByDistance,
} from "@/lib/routes/simulation"
import { RouteSimulationSetup } from "./components/route-simulation-setup"
import { RouteSimulationMap } from "./components/route-simulation-map"
import { RouteMiniMap } from "./components/route-mini-map"
import { RouteElevationMinimap } from "./components/route-elevation-minimap"
import { RouteRideHud } from "./components/route-ride-hud"
import { RouteCompleteDialog } from "./components/route-complete-dialog"
import { RouteDisconnectedOverlay } from "./components/route-disconnected-overlay"
import {
  createIndoorLikePhysicsConfig,
  createInitialPhysicsState,
  stepPhysics,
  type PhysicsConfig,
  type PhysicsState,
} from "@/experiences/physics"
import {
  FALLBACK_SPEED_MPS,
  GRADE_DISPATCH_DELTA_PERCENT,
  GRADE_DISPATCH_INTERVAL_MS,
  smoothingLevelToMeters,
} from "./utils"
import type { RouteProgressMode, RouteSpeedSource } from "./types"

type RouteSimulationExperienceViewProps = {
  connection?: RideExperienceConnection
  search?: {
    routeId?: string
  }
  session: ExperienceSessionAPI
}

function useViewportSize() {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight })
    }
    updateViewportSize()
    window.addEventListener("resize", updateViewportSize)
    return () => window.removeEventListener("resize", updateViewportSize)
  }, [])

  return viewportSize
}

export function RouteSimulationExperienceView({
  connection,
  search,
  session,
}: RouteSimulationExperienceViewProps) {
  const navigate = useNavigate({ from: "/ride/$experienceId" })
  const linkedRouteId = search?.routeId as Id<"routes"> | undefined
  const routes = useQuery(api.routes.list)
  const routeDoc = useQuery(
    api.routes.get,
    linkedRouteId ? { id: linkedRouteId } : "skip"
  )
  const settings = useQuery(api.settings.get)
  const upsertSettings = useMutation(api.settings.upsert)
  const trainerConnected = useRideSelector(session, (s) => s.trainerConnected)
  const paused = useRideSelector(session, (s) => s.paused)
  const telemetryStatus = useRideSelector(
    session,
    (s) => s.telemetry.telemetryStatus
  )
  const [selectedRouteId, setSelectedRouteId] = useState<Id<"routes"> | null>(
    linkedRouteId ?? null
  )
  const [parsedRoute, setParsedRoute] = useState<ParsedRouteGpx | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [distanceMeters, setDistanceMeters] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [smoothingLevel, setSmoothingLevel] = useState(5)
  const [progressMode, setProgressMode] = useState<RouteProgressMode>(
    "trainer-speed"
  )
  const [speedSource, setSpeedSource] =
    useState<RouteSpeedSource>("fallback")
  const [speedKph, setSpeedKph] = useState(25)
  const viewportSize = useViewportSize()
  const lastGradeDispatch = useRef({ gradePercent: NaN, atMs: 0 })
  const routeRef = useRef<ParsedRouteGpx | null>(null)
  const physicsStateRef = useRef<PhysicsState>(createInitialPhysicsState())
  const physicsConfigRef = useRef<PhysicsConfig | null>(null)
  const progressModeRef = useRef<RouteProgressMode>(progressMode)
  const stateRef = useRef({
    distanceMeters: 0,
    elapsedSeconds: 0,
    isActive: false,
    isComplete: false,
    smoothingLevel: 5,
  })

  useEffect(() => {
    routeRef.current = parsedRoute
  }, [parsedRoute])

  useEffect(() => {
    stateRef.current = {
      distanceMeters,
      elapsedSeconds,
      isActive,
      isComplete,
      smoothingLevel,
    }
  }, [distanceMeters, elapsedSeconds, isActive, isComplete, smoothingLevel])

  useEffect(() => {
    progressModeRef.current = progressMode
  }, [progressMode])

  useEffect(() => {
    if (settings) {
      setProgressMode(settings.routeSimulationProgressMode)
    }
  }, [settings])

  const handleProgressModeChange = useCallback(
    (mode: RouteProgressMode) => {
      setProgressMode(mode)
      void upsertSettings({ routeSimulationProgressMode: mode })
    },
    [upsertSettings]
  )

  const physicsConfig = useMemo(
    () =>
      settings
        ? createIndoorLikePhysicsConfig({
            riderWeightKg: settings.riderWeightKg,
            bikeWeightKg: settings.bikeWeightKg,
          })
        : null,
    [settings]
  )

  useEffect(() => {
    physicsConfigRef.current = physicsConfig
  }, [physicsConfig])

  useEffect(() => {
    setSelectedRouteId(linkedRouteId ?? null)
  }, [linkedRouteId])

  useEffect(() => {
    let cancelled = false
    setParsedRoute(null)
    setLoadError(null)

    if (!routeDoc) {
      if (routeDoc === null && linkedRouteId) {
        setLoadError("Route not found. Pick another route.")
      }
      return
    }

    if (!routeDoc.fileUrl) {
      setLoadError("Route GPX file is unavailable. Pick another route.")
      return
    }

    void fetch(routeDoc.fileUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Couldn't load GPX file")
        return response.text()
      })
      .then((text) => {
        if (cancelled) return
        const result = parseRouteGpxText(text, routeDoc.originalFileName)
        if (result.kind === "error") {
          setLoadError(result.message)
          return
        }
        setParsedRoute(result.route)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(
          error instanceof Error ? error.message : "Couldn't load GPX file"
        )
      })

    return () => {
      cancelled = true
    }
  }, [linkedRouteId, routeDoc])

  const selectedRouteDoc = useMemo(
    () => routes?.find((route) => route._id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  )
  const activeRouteTitle = routeDoc?.title ?? selectedRouteDoc?.title ?? null
  const supportsSimulation = session.controls
    .getCapabilities()
    .has(Capability.SimulationGrade)
  const riderPosition = useMemo(
    () =>
      parsedRoute
        ? interpolateRoutePointByDistance(parsedRoute.points, distanceMeters)
        : null,
    [distanceMeters, parsedRoute]
  )
  const gradePercent = useMemo(
    () =>
      parsedRoute
        ? computeRouteGradePercent(
            parsedRoute.points,
            distanceMeters,
            smoothingLevelToMeters(smoothingLevel)
          )
        : 0,
    [distanceMeters, parsedRoute, smoothingLevel]
  )

  const dispatchGrade = useCallback(
    async (grade: number, force = false) => {
      const now = Date.now()
      const last = lastGradeDispatch.current
      if (
        !force &&
        now - last.atMs < GRADE_DISPATCH_INTERVAL_MS &&
        Math.abs(grade - last.gradePercent) < GRADE_DISPATCH_DELTA_PERCENT
      ) {
        return
      }
      lastGradeDispatch.current = { gradePercent: grade, atMs: now }
      await session.controls.dispatch(
        { type: "setSimulationGrade", gradePercent: grade },
        "experience",
        { delivery: "acknowledged" }
      )
    },
    [session]
  )

  const releaseTrainer = useCallback(async () => {
    await session.controls.dispatch(
      { type: "setSimulationGrade", gradePercent: 0 },
      "experience",
      { delivery: "acknowledged" }
    )
    await session.controls.dispatch(
      { type: "setMode", mode: "free" },
      "experience",
      {
        delivery: "acknowledged",
      }
    )
  }, [session])

  const completeRide = useCallback(async () => {
    const route = routeRef.current
    if (!route || stateRef.current.isComplete) return
    setDistanceMeters(route.stats.distanceMeters)
    setIsComplete(true)
    setIsActive(false)
    await releaseTrainer()
    session.pause()
    setCompletionDialogOpen(true)
    setShowConfetti(true)
  }, [releaseTrainer, session])

  useRideFrame(session, (frame) => {
    const route = routeRef.current
    const current = stateRef.current
    if (
      !route ||
      !current.isActive ||
      current.isComplete ||
      session.getState().paused ||
      !session.getState().trainerConnected ||
      session.getState().telemetry.telemetryStatus === "stale"
    ) {
      return
    }

    const deltaSeconds = frame.deltaMs / 1000
    if (deltaSeconds <= 0 || !Number.isFinite(deltaSeconds)) return

    let nextDistance = current.distanceMeters
    let nextElapsed = current.elapsedSeconds

    if (progressModeRef.current === "app-physics") {
      const config = physicsConfigRef.current
      const powerWatts = frame.telemetry?.powerWatts
      if (
        !config ||
        powerWatts === null ||
        powerWatts === undefined ||
        !Number.isFinite(powerWatts)
      ) {
        setSpeedSource("paused-power-missing")
        setSpeedKph(0)
        return
      }

      const currentGrade = computeRouteGradePercent(
        route.points,
        current.distanceMeters,
        smoothingLevelToMeters(current.smoothingLevel)
      )
      const result = stepPhysics({
        state: physicsStateRef.current,
        powerWatts,
        gradePercent: currentGrade,
        deltaSeconds,
        config,
      })
      physicsStateRef.current = result.state
      setSpeedSource("physics")
      setSpeedKph(result.speedMps * 3.6)
      nextDistance = Math.min(
        route.stats.distanceMeters,
        current.distanceMeters + result.distanceDeltaMeters
      )
      nextElapsed = current.elapsedSeconds + deltaSeconds
    } else {
      const trainerSpeed = frame.telemetry?.speedMps
      const speedMps =
        trainerSpeed !== null &&
        trainerSpeed !== undefined &&
        Number.isFinite(trainerSpeed) &&
        trainerSpeed > 0
          ? trainerSpeed
          : FALLBACK_SPEED_MPS
      setSpeedSource(speedMps === FALLBACK_SPEED_MPS ? "fallback" : "trainer")
      setSpeedKph(speedMps * 3.6)
      nextDistance = Math.min(
        route.stats.distanceMeters,
        current.distanceMeters + speedMps * deltaSeconds
      )
      nextElapsed = current.elapsedSeconds + deltaSeconds
    }

    setDistanceMeters(nextDistance)
    setElapsedSeconds(nextElapsed)
    const nextGrade = computeRouteGradePercent(
      route.points,
      nextDistance,
      smoothingLevelToMeters(current.smoothingLevel)
    )
    void dispatchGrade(nextGrade)

    if (nextDistance >= route.stats.distanceMeters) {
      void completeRide()
    }
  })

  useEffect(() => {
    if (!trainerConnected && isActive && !paused) {
      session.pause()
    }
  }, [isActive, paused, session, trainerConnected])

  const handleSelectRoute = useCallback(
    (routeId: Id<"routes">) => {
      setSelectedRouteId(routeId)
      void navigate({
        search: (previous) => ({ ...previous, routeId }),
        replace: true,
      })
    },
    [navigate]
  )

  const handleChangeRoute = useCallback(() => {
    setSelectedRouteId(null)
    setParsedRoute(null)
    setLoadError(null)
    setDistanceMeters(0)
    setElapsedSeconds(0)
    setIsComplete(false)
    setCompletionDialogOpen(false)
    physicsStateRef.current = createInitialPhysicsState()
    void navigate({
      search: (previous) => {
        const nextSearch = { ...previous }
        delete nextSearch.routeId
        return nextSearch
      },
      replace: true,
    })
  }, [navigate])

  const handleStart = useCallback(async () => {
    if (
      !parsedRoute ||
      !trainerConnected ||
      !supportsSimulation ||
      (progressMode === "app-physics" && !physicsConfig)
    ) {
      return
    }
    setDistanceMeters(0)
    setElapsedSeconds(0)
    physicsStateRef.current = createInitialPhysicsState()
    setIsActive(true)
    setIsComplete(false)
    setCompletionDialogOpen(false)
    lastGradeDispatch.current = { gradePercent: NaN, atMs: 0 }
    await session.controls.dispatch(
      { type: "setMode", mode: "simulation" },
      "experience",
      { delivery: "acknowledged" }
    )
    await dispatchGrade(
      computeRouteGradePercent(
        parsedRoute.points,
        0,
        smoothingLevelToMeters(smoothingLevel)
      ),
      true
    )
    session.resume()
  }, [
    dispatchGrade,
    parsedRoute,
    physicsConfig,
    progressMode,
    session,
    smoothingLevel,
    supportsSimulation,
    trainerConnected,
  ])

  const handlePause = useCallback(async () => {
    session.pause()
    await releaseTrainer()
  }, [releaseTrainer, session])

  const handleResume = useCallback(async () => {
    if (!parsedRoute) return
    await session.controls.dispatch(
      { type: "setMode", mode: "simulation" },
      "experience",
      { delivery: "acknowledged" }
    )
    await dispatchGrade(gradePercent, true)
    session.resume()
  }, [dispatchGrade, gradePercent, parsedRoute, session])

  const handleStop = useCallback(async () => {
    await releaseTrainer()
    session.pause()
    setIsActive(false)
    setIsComplete(false)
    physicsStateRef.current = createInitialPhysicsState()
  }, [releaseTrainer, session])

  const handleRouteClick = useCallback(
    (position: RoutePosition) => {
      if (!parsedRoute) return
      const nextDistance = findNearestRouteDistanceMeters(
        parsedRoute.points,
        position
      )
      setDistanceMeters(nextDistance)
      if (progressMode === "app-physics") {
        physicsStateRef.current = {
          ...physicsStateRef.current,
          speedMps: 0,
        }
      }
      const nextGrade = computeRouteGradePercent(
        parsedRoute.points,
        nextDistance,
        smoothingLevelToMeters(smoothingLevel)
      )
      void dispatchGrade(nextGrade, true)
    },
    [dispatchGrade, parsedRoute, progressMode, smoothingLevel]
  )

  const startDisabledReason = !parsedRoute
    ? "Choose a valid GPX route."
    : !trainerConnected
      ? "Connect a trainer before starting."
      : !supportsSimulation
        ? "Connected trainer does not support simulation grade."
        : progressMode === "app-physics" && !physicsConfig
          ? "Loading physics profile."
          : null

  if (!isActive && !isComplete) {
    return (
      <RouteSimulationSetup
        isLoading={
          routes === undefined ||
          (linkedRouteId !== undefined && routeDoc === undefined)
        }
        loadError={loadError}
        onChangeRoute={handleChangeRoute}
        onProgressModeChange={handleProgressModeChange}
        onSelectRoute={handleSelectRoute}
        onStart={handleStart}
        physicsProfileReady={settings !== undefined}
        parsedRoute={parsedRoute}
        progressMode={progressMode}
        routes={routes ?? []}
        selectedRouteId={selectedRouteId}
        startDisabledReason={startDisabledReason}
        title={activeRouteTitle}
      />
    )
  }

  return parsedRoute ? (
    <div className="absolute inset-0 overflow-hidden bg-background">
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
      <RouteSimulationMap
        follow={isActive && !paused}
        onRouteClick={handleRouteClick}
        riderPosition={riderPosition}
        route={parsedRoute}
      />
      <RouteMiniMap
        onRouteClick={handleRouteClick}
        riderPosition={riderPosition}
        route={parsedRoute}
      />
      <RouteElevationMinimap
        distanceMeters={distanceMeters}
        samples={parsedRoute.elevationSamples}
        totalDistanceMeters={parsedRoute.stats.distanceMeters}
      />
      <RouteRideHud
        distanceMeters={distanceMeters}
        elapsedSeconds={elapsedSeconds}
        gradePercent={gradePercent}
        isPaused={paused}
        onPause={handlePause}
        onResume={handleResume}
        onSmoothingChange={setSmoothingLevel}
        onStop={handleStop}
        smoothingLevel={smoothingLevel}
        speedKph={speedKph}
        speedSource={speedSource}
        telemetryStatus={telemetryStatus}
        totalDistanceMeters={parsedRoute.stats.distanceMeters}
      />
      <RouteCompleteDialog
        distanceMeters={parsedRoute.stats.distanceMeters}
        elapsedSeconds={elapsedSeconds}
        onOpenChange={setCompletionDialogOpen}
        open={completionDialogOpen}
        routeTitle={activeRouteTitle ?? parsedRoute.title}
      />
      {!trainerConnected && isActive && (
        <RouteDisconnectedOverlay
          onReconnect={connection?.reconnect}
          onStop={() => {
            void handleStop()
          }}
        />
      )}
    </div>
  ) : null
}
