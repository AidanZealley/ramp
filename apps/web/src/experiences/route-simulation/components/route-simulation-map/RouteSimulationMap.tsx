import type {
  ParsedRouteGpx,
  RoutePoint,
  RoutePosition,
} from "@/lib/routes/types"
import type { RouteMapPresentation } from "../../types"
import { RouteMap } from "@/components/route/route-map"

type RouteSimulationMapProps = {
  follow: boolean
  onRouteClick: (position: RoutePosition) => void
  presentation: RouteMapPresentation
  riderDistanceMeters: number
  riderGradePercent: number
  riderPosition: RoutePoint | null
  route: ParsedRouteGpx
}

export const RouteSimulationMap = ({
  follow,
  onRouteClick,
  presentation,
  riderDistanceMeters,
  riderGradePercent,
  riderPosition,
  route,
}: RouteSimulationMapProps) => {
  return (
    <RouteMap
      bounds={route.bounds}
      className="absolute inset-0 bg-muted"
      finish={route.finish}
      followPosition={follow}
      geojson={route.geojson}
      onRouteClick={onRouteClick}
      riderDistanceMeters={riderDistanceMeters}
      riderGradePercent={riderGradePercent}
      riderPosition={riderPosition}
      riderRoutePoints={route.points}
      start={route.start}
      terrainEnabled={presentation.terrainEnabled}
      viewMode={presentation.viewMode}
    />
  )
}
