import type { FeatureCollection, Point } from "geojson"
import type { RoutePosition } from "@/lib/routes/types"

export const buildRouteEndpointGeojson = ({
  finish,
  start,
}: {
  finish: RoutePosition | null | undefined
  start: RoutePosition | null | undefined
}): FeatureCollection<Point, { kind: "start" | "finish" }> => ({
  type: "FeatureCollection",
  features: [
    ...(start
      ? [
          {
            type: "Feature" as const,
            properties: { kind: "start" as const },
            geometry: {
              type: "Point" as const,
              coordinates: [start.lng, start.lat],
            },
          },
        ]
      : []),
    ...(finish
      ? [
          {
            type: "Feature" as const,
            properties: { kind: "finish" as const },
            geometry: {
              type: "Point" as const,
              coordinates: [finish.lng, finish.lat],
            },
          },
        ]
      : []),
  ],
})

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
