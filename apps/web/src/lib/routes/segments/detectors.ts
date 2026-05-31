import { climbSegmentDetector } from "./climb"
import type { RouteSegmentDetector } from "./types"

export const routeSegmentDetectors: Array<RouteSegmentDetector> = [
  climbSegmentDetector,
]
