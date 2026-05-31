import type { RoutePoint } from "@/lib/routes/types"
import { routeSegmentDetectors } from "./detectors"
import type { GeneratedRouteSegment, RouteSegmentDetector } from "./types"

export function detectRouteSegments(
  points: Array<RoutePoint>,
  detectors = routeSegmentDetectors
): Array<GeneratedRouteSegment> {
  return detectors.flatMap((detector: RouteSegmentDetector) =>
    detector.detect(points)
  )
}

export type {
  GeneratedRouteSegment,
  RouteSegmentDetector,
  RouteSegmentType,
} from "./types"
