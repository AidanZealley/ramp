import { Layer, Source } from "@vis.gl/react-maplibre"
import type { FeatureCollection, Point } from "geojson"
import type { RouteMapColors } from "../../types"

const EMPTY_RIDER_GEOJSON: FeatureCollection<Point> = {
  type: "FeatureCollection",
  features: [],
}

type RouteRiderSourceProps = {
  colors: RouteMapColors
  initialData?: FeatureCollection<Point>
  data?: FeatureCollection<Point>
}

export const RouteRiderSource = ({
  colors,
  data,
  initialData,
}: RouteRiderSourceProps) => (
  <Source
    id="route-rider"
    type="geojson"
    data={data ?? initialData ?? EMPTY_RIDER_GEOJSON}
  >
    <Layer
      id="route-rider-halo"
      type="circle"
      paint={{
        "circle-color": colors.riderHalo,
        "circle-radius": 14,
        "circle-opacity": 0.9,
        "circle-stroke-color": colors.routeLineShadow,
        "circle-stroke-width": 2,
        "circle-pitch-alignment": "map",
      }}
    />
    <Layer
      id="route-rider-dot"
      type="circle"
      paint={{
        "circle-color": colors.routeLine,
        "circle-radius": 5,
        "circle-pitch-alignment": "map",
      }}
    />
  </Source>
)
