import { useCallback, useEffect, useMemo, useRef } from "react"
import Map, { Layer, Marker, Source, type MapRef } from "@vis.gl/react-maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import type { FeatureCollection, LineString } from "geojson"
import { useTheme } from "@/components/theme-provider"
import type { RouteBounds, RoutePosition } from "@/lib/routes/types"
import { routeMapStyleUrls, routeMapTheme } from "./colors"

type RouteMapProps = {
  geojson: FeatureCollection<LineString>
  bounds: RouteBounds | null
  start: RoutePosition | null
  finish: RoutePosition | null
}

const ROUTE_PADDING_PX = 40

export const RouteMap = ({ geojson, bounds, start, finish }: RouteMapProps) => {
  const mapRef = useRef<MapRef>(null)
  const { theme } = useTheme()
  const colors = routeMapTheme[theme]
  const mapStyle =
    theme === "dark"
      ? import.meta.env.VITE_ROUTE_MAP_DARK_STYLE_URL ||
        import.meta.env.VITE_ROUTE_MAP_STYLE_URL ||
        routeMapStyleUrls.dark
      : import.meta.env.VITE_ROUTE_MAP_LIGHT_STYLE_URL ||
        import.meta.env.VITE_ROUTE_MAP_STYLE_URL ||
        routeMapStyleUrls.light
  const initialViewState = useMemo(() => {
    const center = start ?? { lat: 39.5, lng: -98.35 }
    return {
      latitude: center.lat,
      longitude: center.lng,
      zoom: bounds ? 10 : 3,
    }
  }, [bounds, start])

  const fitRouteBounds = useCallback(() => {
    if (!bounds || !mapRef.current) return

    mapRef.current.resize()
    mapRef.current.fitBounds(
      [
        [bounds.minLng, bounds.minLat],
        [bounds.maxLng, bounds.maxLat],
      ],
      { padding: ROUTE_PADDING_PX, duration: 0 }
    )
  }, [bounds])

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(fitRouteBounds)

    return () => window.cancelAnimationFrame(animationFrame)
  }, [fitRouteBounds])

  return (
    <div className="h-[420px] overflow-hidden rounded-lg border border-border/70 bg-muted">
      <Map
        key={mapStyle}
        ref={mapRef}
        mapStyle={mapStyle}
        initialViewState={initialViewState}
        attributionControl={false}
        reuseMaps
        onLoad={fitRouteBounds}
      >
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
      </Map>
    </div>
  )
}
