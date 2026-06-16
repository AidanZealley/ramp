import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Capability } from "@ramp/ride-core"
import { useRideFrame } from "@ramp/ride-react"
import {
  FALLBACK_SPEED_MPS,
  GRADE_DISPATCH_DELTA_PERCENT,
  GRADE_DISPATCH_INTERVAL_MS,
  SEEK_GRADE_DISPATCH_INTERVAL_MS,
  SEEK_TRANSITION_DURATION_MS,
  getPreservedSeekSpeedMps,
  getSeekTransitionGrade,
  smoothingLevelToMeters,
} from "../utils"
import type { ParsedRouteGpx, RoutePosition } from "@/lib/routes/types"
import type { RideSessionController } from "@ramp/ride-core"
import type { PhysicsConfig, PhysicsState } from "@/experiences/physics"
import type {
  LastGradeDispatch,
  RouteMapPresentation,
  RouteProgressMode,
  RouteSimulationRideController,
  RouteSpeedSource,
  SeekTransitionState,
} from "../types"
import { createInitialPhysicsState, stepPhysics } from "@/experiences/physics"
import {
  computeRouteGradeDiagnostics,
  computeRouteGradePercent,
  findNearestRouteDistanceMeters,
  interpolateRoutePointByDistance,
} from "@/lib/routes/simulation"

type UseRouteSimulationRideInput = {
  parsedRoute: ParsedRouteGpx | null
  physicsConfig: PhysicsConfig | null
  progressMode: RouteProgressMode
  session: RideSessionController
  supportsSimulation: boolean
  trainerConnected: boolean
}

export function useRouteSimulationRide({
  parsedRoute,
  physicsConfig,
  progressMode,
  session,
  supportsSimulation,
  trainerConnected,
}: UseRouteSimulationRideInput): RouteSimulationRideController {
  const [distanceMeters, setDistanceMeters] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [smoothingLevel, setSmoothingLevel] = useState(0)
  const [mapPresentation, setMapPresentation] = useState<RouteMapPresentation>({
    viewMode: "perspective",
    terrainEnabled: false,
  })
  const [speedSource, setSpeedSource] = useState<RouteSpeedSource>("fallback")
  const [speedKph, setSpeedKph] = useState(25)
  const [displayGradePercent, setDisplayGradePercent] = useState(0)
  const [lastGradeDispatchState, setLastGradeDispatchState] =
    useState<LastGradeDispatch | null>(null)
  const lastGradeDispatch = useRef<LastGradeDispatch>({
    gradePercent: NaN,
    distanceMeters: 0,
    atMs: 0,
  })
  const routeRef = useRef<ParsedRouteGpx | null>(null)
  const physicsStateRef = useRef<PhysicsState>(createInitialPhysicsState())
  const physicsConfigRef = useRef<PhysicsConfig | null>(null)
  const progressModeRef = useRef<RouteProgressMode>(progressMode)
  const seekTransitionRef = useRef<SeekTransitionState | null>(null)
  const stateRef = useRef({
    distanceMeters: 0,
    elapsedSeconds: 0,
    isActive: false,
    isComplete: false,
    smoothingLevel: 0,
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
    physicsConfigRef.current = physicsConfig
  }, [physicsConfig])

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
  const gradeDiagnostics = useMemo(
    () =>
      parsedRoute
        ? computeRouteGradeDiagnostics(
            parsedRoute.points,
            distanceMeters,
            smoothingLevelToMeters(smoothingLevel)
          )
        : null,
    [distanceMeters, parsedRoute, smoothingLevel]
  )

  useEffect(() => {
    if (!seekTransitionRef.current) {
      setDisplayGradePercent(gradePercent)
    }
  }, [gradePercent])

  const resetSeekTransition = useCallback(() => {
    seekTransitionRef.current = null
  }, [])

  const recordGradeDispatch = useCallback((grade: number, atMs: number) => {
    const nextDispatch = {
      gradePercent: grade,
      distanceMeters: stateRef.current.distanceMeters,
      atMs,
    }
    lastGradeDispatch.current = nextDispatch
    setLastGradeDispatchState(nextDispatch)
  }, [])

  const resetRideStateForRouteChange = useCallback(() => {
    seekTransitionRef.current = null
    setDistanceMeters(0)
    setElapsedSeconds(0)
    setIsComplete(false)
    setCompletionDialogOpen(false)
    physicsStateRef.current = createInitialPhysicsState()
  }, [])

  const dispatchGrade = useCallback(
    async (
      grade: number,
      force = false,
      options?: { intervalMs?: number; deltaPercent?: number }
    ) => {
      if (!session.controls.getCapabilities().has(Capability.SimulationGrade)) {
        return
      }
      const now = Date.now()
      const last = lastGradeDispatch.current
      const intervalMs = options?.intervalMs ?? GRADE_DISPATCH_INTERVAL_MS
      const deltaPercent = options?.deltaPercent ?? GRADE_DISPATCH_DELTA_PERCENT
      if (
        !force &&
        now - last.atMs < intervalMs &&
        Math.abs(grade - last.gradePercent) < deltaPercent
      ) {
        return
      }
      recordGradeDispatch(grade, now)
      await session.controls.dispatch(
        { type: "setSimulationGrade", gradePercent: grade },
        "experience",
        { delivery: "acknowledged" }
      )
    },
    [recordGradeDispatch, session]
  )

  const releaseTrainer = useCallback(async () => {
    recordGradeDispatch(0, Date.now())
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
  }, [recordGradeDispatch, session])

  const completeRide = useCallback(async () => {
    const route = routeRef.current
    if (!route || stateRef.current.isComplete) return
    seekTransitionRef.current = null
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

      const routeGrade = computeRouteGradePercent(
        route.points,
        current.distanceMeters,
        smoothingLevelToMeters(current.smoothingLevel)
      )
      const seekTransition = seekTransitionRef.current
      let effectiveGrade = routeGrade
      if (seekTransition) {
        const transitionGrade = getSeekTransitionGrade({
          ...seekTransition,
          nowMs: Date.now(),
        })
        effectiveGrade = transitionGrade.gradePercent
        setDisplayGradePercent(effectiveGrade)
        void dispatchGrade(
          effectiveGrade,
          !seekTransition.initialGradeDispatched,
          { intervalMs: SEEK_GRADE_DISPATCH_INTERVAL_MS }
        )
        seekTransition.initialGradeDispatched = true
        if (transitionGrade.progress >= 1) {
          seekTransitionRef.current = null
          void dispatchGrade(seekTransition.toGradePercent, true)
        }
      } else {
        setDisplayGradePercent(routeGrade)
      }
      const result = stepPhysics({
        state: physicsStateRef.current,
        powerWatts,
        gradePercent: effectiveGrade,
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
    if (!seekTransitionRef.current) {
      void dispatchGrade(nextGrade)
    }

    if (nextDistance >= route.stats.distanceMeters) {
      void completeRide()
    }
  })

  useEffect(() => {
    if (!trainerConnected && isActive && !session.getState().paused) {
      session.pause()
    }
  }, [isActive, session, trainerConnected])

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
    seekTransitionRef.current = null
    physicsStateRef.current = createInitialPhysicsState()
    setIsActive(true)
    setIsComplete(false)
    setCompletionDialogOpen(false)
    lastGradeDispatch.current = {
      gradePercent: NaN,
      distanceMeters: 0,
      atMs: 0,
    }
    setLastGradeDispatchState(null)
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
    seekTransitionRef.current = null
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

  const handleRestart = useCallback(async () => {
    await handleStart()
  }, [handleStart])

  const handleResumeActivity = useCallback(
    async ({
      distanceMeters: nextDistanceMeters,
      elapsedSeconds: nextElapsedSeconds,
    }: {
      distanceMeters: number
      elapsedSeconds: number
    }) => {
      const route = routeRef.current
      if (!route || !trainerConnected || !supportsSimulation) return
      const clampedDistanceMeters = Math.max(
        0,
        Math.min(route.stats.distanceMeters, nextDistanceMeters)
      )
      setDistanceMeters(clampedDistanceMeters)
      setElapsedSeconds(Math.max(0, nextElapsedSeconds))
      setIsActive(true)
      setIsComplete(false)
      setCompletionDialogOpen(false)
      seekTransitionRef.current = null
      await session.controls.dispatch(
        { type: "setMode", mode: "simulation" },
        "experience",
        { delivery: "acknowledged" }
      )
      await dispatchGrade(
        computeRouteGradePercent(
          route.points,
          clampedDistanceMeters,
          smoothingLevelToMeters(stateRef.current.smoothingLevel)
        ),
        true
      )
      session.resume()
    },
    [dispatchGrade, session, supportsSimulation, trainerConnected]
  )

  const handleStop = useCallback(async () => {
    seekTransitionRef.current = null
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
      const currentDistance = stateRef.current.distanceMeters
      const currentGrade = seekTransitionRef.current
        ? getSeekTransitionGrade({
            ...seekTransitionRef.current,
            nowMs: Date.now(),
          }).gradePercent
        : computeRouteGradePercent(
            parsedRoute.points,
            currentDistance,
            smoothingLevelToMeters(smoothingLevel)
          )
      seekTransitionRef.current = null
      setDistanceMeters(nextDistance)
      const nextGrade = computeRouteGradePercent(
        parsedRoute.points,
        nextDistance,
        smoothingLevelToMeters(smoothingLevel)
      )
      if (progressMode === "app-physics") {
        const preservedSpeedMps = getPreservedSeekSpeedMps(
          physicsStateRef.current.speedMps
        )
        physicsStateRef.current = {
          ...physicsStateRef.current,
          speedMps: preservedSpeedMps,
        }
        seekTransitionRef.current = {
          startedAtMs: Date.now(),
          durationMs: SEEK_TRANSITION_DURATION_MS,
          fromDistanceMeters: currentDistance,
          toDistanceMeters: nextDistance,
          fromGradePercent: currentGrade,
          toGradePercent: nextGrade,
          fromSpeedMps: preservedSpeedMps,
          initialGradeDispatched: true,
        }
        setDisplayGradePercent(currentGrade)
        void dispatchGrade(currentGrade, true, {
          intervalMs: SEEK_GRADE_DISPATCH_INTERVAL_MS,
        })
        return
      }
      void dispatchGrade(nextGrade, true)
    },
    [dispatchGrade, parsedRoute, progressMode, smoothingLevel]
  )

  return {
    completionDialogOpen,
    debug: {
      gradeDiagnostics,
      lastGradeDispatch: lastGradeDispatchState,
    },
    distanceMeters,
    displayGradePercent,
    elapsedSeconds,
    handlePause,
    handleResume,
    handleRestart,
    handleResumeActivity,
    handleRouteClick,
    handleStart,
    handleStop,
    isActive,
    isComplete,
    mapPresentation,
    riderPosition,
    resetRideStateForRouteChange,
    resetSeekTransition,
    setCompletionDialogOpen,
    setMapPresentation,
    setShowConfetti,
    setSmoothingLevel,
    showConfetti,
    smoothingLevel,
    speedKph,
    speedSource,
  }
}
