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
  riderGradePercent: number
  riderPosition: RoutePoint | null
  route: ParsedRouteGpx
}

export const RouteSimulationMap = ({
  follow,
  onRouteClick,
  presentation,
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
      riderElevationMeters={riderPosition?.elevationMeters}
      riderGradePercent={riderGradePercent}
      riderPosition={riderPosition}
      start={route.start}
      terrainEnabled={presentation.terrainEnabled}
      viewMode={presentation.viewMode}
    />
  )
}
