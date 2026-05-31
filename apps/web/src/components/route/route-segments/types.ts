import type { Id } from "#convex/_generated/dataModel"
import type { GeneratedRouteSegment } from "@/lib/routes/segments"

export type StoredRouteSegment = GeneratedRouteSegment & {
  _id: Id<"routeSegments">
  _creationTime?: number
  source?: "generated"
  generatedAt?: number
}
