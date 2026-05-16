import type { ParsedRouteGpx, RoutePosition } from "@/lib/routes/types"
import { RouteMap } from "@/components/route/route-map"

type RouteMiniMapProps = {
  onRouteClick: (position: RoutePosition) => void
  riderDistanceMeters: number
  riderPosition: RoutePosition | null
  route: ParsedRouteGpx
}

export const RouteMiniMap = ({
  onRouteClick,
  riderDistanceMeters,
  riderPosition,
  route,
}: RouteMiniMapProps) => {
  return (
    <div className="absolute top-16 left-3 h-32 w-48 overflow-hidden rounded-lg border border-border/70 bg-card shadow-lg sm:top-20 sm:left-5 sm:h-40 sm:w-64">
      <RouteMap
        bounds={route.bounds}
        className="h-full w-full"
        finish={route.finish}
        geojson={route.geojson}
        onRouteClick={onRouteClick}
        riderDistanceMeters={riderDistanceMeters}
        riderPosition={riderPosition}
        riderRoutePoints={route.points}
        start={route.start}
        terrainEnabled={false}
        viewMode="top-down"
      />
    </div>
  )
}
