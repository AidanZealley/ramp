import type { Doc } from "#convex/_generated/dataModel"
import type { ParsedRouteGpx, RoutePosition } from "@/lib/routes/types"

export type RouteSimulationRoute = {
  doc: Doc<"routes"> & { fileUrl?: string | null }
  parsed: ParsedRouteGpx
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
  speedSource: "trainer" | "fallback"
  telemetryStatus: "missing" | "fresh" | "stale"
}
