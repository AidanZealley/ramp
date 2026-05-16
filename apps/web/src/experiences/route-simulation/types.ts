import type { Dispatch, SetStateAction } from "react"
import type { Doc, Id } from "#convex/_generated/dataModel"
import type { ParsedRouteGpx, RoutePoint, RoutePosition } from "@/lib/routes/types"
import type { PhysicsConfig } from "@/experiences/physics"

export type RouteSimulationRoute = {
  doc: Doc<"routes"> & { fileUrl?: string | null }
  parsed: ParsedRouteGpx
}

export type RouteProgressMode = "trainer-speed" | "app-physics"

export type RouteMapViewMode = "top-down" | "perspective"

export type RouteMapPresentation = {
  viewMode: RouteMapViewMode
  terrainEnabled: boolean
}

export type RouteSpeedSource =
  | "trainer"
  | "fallback"
  | "physics"
  | "paused-power-missing"

export type SeekTransitionState = {
  startedAtMs: number
  durationMs: number
  fromDistanceMeters: number
  toDistanceMeters: number
  fromGradePercent: number
  toGradePercent: number
  fromSpeedMps: number
  initialGradeDispatched: boolean
}

export type RouteSimulationRouteState = {
  activeRouteTitle: string | null
  handleChangeRoute: () => void
  handleSelectRoute: (routeId: Id<"routes">) => void
  isLoading: boolean
  linkedRouteId: Id<"routes"> | undefined
  loadError: string | null
  parsedRoute: ParsedRouteGpx | null
  routes: Array<Doc<"routes">>
  selectedRouteId: Id<"routes"> | null
}

export type RouteSimulationSettingsState = {
  handleProgressModeChange: (mode: RouteProgressMode) => void
  physicsConfig: PhysicsConfig | null
  physicsProfileReady: boolean
  progressMode: RouteProgressMode
}

export type RouteSimulationRideController = {
  completionDialogOpen: boolean
  distanceMeters: number
  displayGradePercent: number
  elapsedSeconds: number
  handlePause: () => void
  handleResume: () => void
  handleRouteClick: (position: RoutePosition) => void
  handleStart: () => void
  handleStop: () => void
  isActive: boolean
  isComplete: boolean
  mapPresentation: RouteMapPresentation
  riderPosition: RoutePoint | null
  resetRideStateForRouteChange: () => void
  resetSeekTransition: () => void
  setCompletionDialogOpen: (open: boolean) => void
  setMapPresentation: Dispatch<SetStateAction<RouteMapPresentation>>
  setShowConfetti: (show: boolean) => void
  setSmoothingLevel: (level: number) => void
  showConfetti: boolean
  smoothingLevel: number
  speedKph: number
  speedSource: RouteSpeedSource
}

export type RouteRideSnapshot = {
  distanceMeters: number
  elapsedSeconds: number
  gradePercent: number
  isActive: boolean
  isComplete: boolean
  riderPosition: RoutePosition | null
  smoothingLevel: number
  speedKph: number
  speedSource: RouteSpeedSource
  telemetryStatus: "missing" | "fresh" | "stale"
}
