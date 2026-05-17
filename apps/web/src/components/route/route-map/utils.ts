import type { FeatureCollection, Point } from "geojson"
import type { RoutePosition } from "@/lib/routes/types"

export const buildRiderGeojson = (
  position: RoutePosition | null | undefined
): FeatureCollection<Point> => ({
  type: "FeatureCollection",
  features: position
    ? [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [position.lng, position.lat],
          },
        },
      ]
    : [],
})
