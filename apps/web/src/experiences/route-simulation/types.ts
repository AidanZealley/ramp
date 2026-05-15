import type { Doc } from "#convex/_generated/dataModel"
import type { ParsedRouteGpx, RoutePosition } from "@/lib/routes/types"

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
