import type { ParsedRouteGpx, RoutePosition } from "@/lib/routes/types"
import { RouteMap } from "@/components/route/route-map"

type RouteSimulationMapProps = {
  follow: boolean
  onRouteClick: (position: RoutePosition) => void
  riderPosition: RoutePosition | null
  route: ParsedRouteGpx
}

export const RouteSimulationMap = ({
  follow,
  onRouteClick,
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
      riderPosition={riderPosition}
      start={route.start}
    />
  )
}
