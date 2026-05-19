import { Layer, Source } from "@vis.gl/react-maplibre"
import {
  TERRAIN_ATTRIBUTION,
  TERRAIN_SOURCE_ID,
  TERRAIN_TILE_URL,
} from "../../constants"
import type { RouteMapColors } from "@/components/route/route-map/types"

type RouteTerrainSourceProps = {
  colors: RouteMapColors
}

export const RouteTerrainSource = ({ colors }: RouteTerrainSourceProps) => (
  <Source
    id={TERRAIN_SOURCE_ID}
    type="raster-dem"
    tiles={[TERRAIN_TILE_URL]}
    tileSize={256}
    maxzoom={15}
    encoding="terrarium"
    attribution={TERRAIN_ATTRIBUTION}
  >
    <Layer
      id="route-terrain-hillshade"
      type="hillshade"
      paint={{
        "hillshade-shadow-color": colors.terrainShadow,
        "hillshade-highlight-color": colors.terrainHighlight,
        "hillshade-accent-color": colors.terrainAccent,
        "hillshade-exaggeration": 0.45,
      }}
    />
  </Source>
)
