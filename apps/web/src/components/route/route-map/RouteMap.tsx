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
  className?: string
  followPosition?: boolean
  onRouteClick?: (position: RoutePosition) => void
  riderPosition?: RoutePosition | null
  start: RoutePosition | null
  finish: RoutePosition | null
}

const ROUTE_PADDING_PX = 40

export const RouteMap = ({
  className,
  followPosition = false,
  geojson,
  bounds,
  onRouteClick,
  riderPosition,
  start,
  finish,
}: RouteMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    const container = containerRef.current
    if (!container || !window.ResizeObserver) return

    const observer = new ResizeObserver(() => {
      fitRouteBounds()
    })
    observer.observe(container)

    return () => observer.disconnect()
  }, [fitRouteBounds])

  useEffect(() => {
    if (!followPosition || !riderPosition || !mapRef.current) return

    mapRef.current.easeTo({
      center: [riderPosition.lng, riderPosition.lat],
      zoom: Math.max(mapRef.current.getZoom(), 15),
      duration: 450,
    })
  }, [followPosition, riderPosition])

  return (
    <div
      ref={containerRef}
      className={
        className ??
        "h-[420px] overflow-hidden rounded-lg border border-border/70 bg-muted"
      }
    >
      <Map
        key={mapStyle}
        ref={mapRef}
        mapStyle={mapStyle}
        initialViewState={initialViewState}
        attributionControl={false}
        reuseMaps
        onLoad={fitRouteBounds}
        onClick={(event) => {
          onRouteClick?.({
            lat: event.lngLat.lat,
            lng: event.lngLat.lng,
          })
        }}
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
        {riderPosition && (
          <Marker
            latitude={riderPosition.lat}
            longitude={riderPosition.lng}
            anchor="center"
          >
            <div className="grid size-7 place-items-center rounded-full bg-background/90 shadow-lg ring-2 ring-primary">
              <div className="size-3 rounded-full bg-primary" />
            </div>
          </Marker>
        )}
      </Map>
    </div>
  )
}
