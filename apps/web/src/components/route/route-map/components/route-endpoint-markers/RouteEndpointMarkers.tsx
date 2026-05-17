import { Marker } from "@vis.gl/react-maplibre"
import type { RoutePosition } from "@/lib/routes/types"
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
}: RouteEndpointMarkersProps) => (
  <>
    {start && (
      <Marker latitude={start.lat} longitude={start.lng} anchor="center">
        <div
          className="size-3 rounded-full border-2 border-background shadow"
          style={{ backgroundColor: colors.startPoint }}
        />
      </Marker>
    )}
    {finish && (
      <Marker latitude={finish.lat} longitude={finish.lng} anchor="center">
        <div
          className="size-3 rounded-full border-2 border-background shadow"
          style={{ backgroundColor: colors.finishPoint }}
        />
      </Marker>
    )}
  </>
)
