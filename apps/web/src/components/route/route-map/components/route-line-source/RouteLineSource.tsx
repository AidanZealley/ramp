import { Layer, Source } from "@vis.gl/react-maplibre"
import type { FeatureCollection, LineString } from "geojson"
import type { RouteMapColors } from "../../types"

type RouteLineSourceProps = {
  colors: RouteMapColors
  geojson: FeatureCollection<LineString>
}

export const RouteLineSource = ({ colors, geojson }: RouteLineSourceProps) => (
  <Source id="route-line" type="geojson" data={geojson}>
    <Layer
      id="route-line-shadow"
      type="line"
      paint={{
        "line-color": colors.routeLineShadow,
        "line-width": 7,
        "line-opacity": 0.5,
      }}
    />
    <Layer
      id="route-line-primary"
      type="line"
      paint={{
        "line-color": colors.routeLine,
        "line-width": 4,
      }}
    />
  </Source>
)
