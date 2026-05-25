import { useMemo } from "react"
import { Layer, Source } from "@vis.gl/react-maplibre"
import type { RoutePosition } from "@/lib/routes/types"
import { buildRouteEndpointGeojson } from "../../utils"
import type { RouteMapColors } from "../../types"

type RouteEndpointMarkersProps = {
  colors: RouteMapColors
  finish: RoutePosition | null
  start: RoutePosition | null
}

export const RouteEndpointMarkers = ({
  colors,
  finish,
  start,
}: RouteEndpointMarkersProps) => {
  const endpointGeojson = useMemo(
    () => buildRouteEndpointGeojson({ finish, start }),
    [finish, start]
  )

  return (
    <Source id="route-endpoints" type="geojson" data={endpointGeojson}>
      <Layer
        id="route-endpoints-shadow"
        type="circle"
        paint={{
          "circle-color": colors.routeLineShadow,
          "circle-radius": 8,
          "circle-opacity": 0.35,
          "circle-blur": 0.25,
          "circle-pitch-alignment": "map",
        }}
      />
      <Layer
        id="route-endpoints-start"
        type="circle"
        filter={["==", ["get", "kind"], "start"]}
        paint={{
          "circle-color": colors.startPoint,
          "circle-radius": 4,
          "circle-stroke-color": colors.riderHalo,
          "circle-stroke-width": 2,
          "circle-pitch-alignment": "map",
        }}
      />
      <Layer
        id="route-endpoints-finish"
        type="circle"
        filter={["==", ["get", "kind"], "finish"]}
        paint={{
          "circle-color": colors.finishPoint,
          "circle-radius": 4,
          "circle-stroke-color": colors.riderHalo,
          "circle-stroke-width": 2,
          "circle-pitch-alignment": "map",
        }}
      />
    </Source>
  )
}
