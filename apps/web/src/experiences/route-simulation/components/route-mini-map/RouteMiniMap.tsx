import { useCallback, useEffect, useMemo, useRef } from "react"
import Map, { Layer, Marker, Source } from "@vis.gl/react-maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import type { MapRef } from "@vis.gl/react-maplibre"
import type { FeatureCollection, Point } from "geojson"
import type { ParsedRouteGpx, RoutePosition } from "@/lib/routes/types"
import {
  routeMapStyleUrls,
  routeMapTheme,
} from "@/components/route/route-map/colors"
import { useTheme } from "@/components/theme-provider"
import { interpolateRoutePointByDistance } from "@/lib/routes/simulation"

type RouteMiniMapProps = {
  onRouteClick: (position: RoutePosition) => void
  riderDistanceMeters: number
  riderPosition: RoutePosition | null
  route: ParsedRouteGpx
}

const ROUTE_PADDING_PX = 24

const buildRiderGeojson = (
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

export const RouteMiniMap = ({
  onRouteClick,
  riderDistanceMeters,
  riderPosition,
  route,
}: RouteMiniMapProps) => {
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
  const displayedRiderPosition = useMemo(
    () =>
      interpolateRoutePointByDistance(route.points, riderDistanceMeters) ??
      riderPosition,
    [riderDistanceMeters, riderPosition, route.points]
  )
  const riderGeojson = useMemo(
    () => buildRiderGeojson(displayedRiderPosition),
    [displayedRiderPosition]
  )
  const initialViewState = useMemo(() => {
    const center = route.start ?? { lat: 39.5, lng: -98.35 }
    return {
      latitude: center.lat,
      longitude: center.lng,
      zoom: route.bounds ? 10 : 3,
      pitch: 0,
      bearing: 0,
    }
  }, [route.bounds, route.start])

  const fitRouteBounds = useCallback(() => {
    if (!route.bounds || !mapRef.current) return

    mapRef.current.resize()
    mapRef.current.fitBounds(
      [
        [route.bounds.minLng, route.bounds.minLat],
        [route.bounds.maxLng, route.bounds.maxLat],
      ],
      {
        padding: ROUTE_PADDING_PX,
        duration: 0,
        pitch: 0,
        bearing: 0,
      }
    )
  }, [route.bounds])

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(fitRouteBounds)

    return () => window.cancelAnimationFrame(animationFrame)
  }, [fitRouteBounds])

  useEffect(() => {
    const container = containerRef.current
    const ResizeObserver = window.ResizeObserver
    if (!container || typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(() => {
      fitRouteBounds()
    })
    observer.observe(container)

    return () => observer.disconnect()
  }, [fitRouteBounds])

  return (
    <div
      ref={containerRef}
      className="absolute top-16 left-3 h-32 w-48 overflow-hidden rounded-lg border border-border/70 bg-card shadow-lg sm:top-20 sm:left-5 sm:h-40 sm:w-64"
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
          onRouteClick({
            lat: event.lngLat.lat,
            lng: event.lngLat.lng,
          })
        }}
      >
        <Source id="route-line" type="geojson" data={route.geojson}>
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
        <Source id="route-rider" type="geojson" data={riderGeojson}>
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
        {route.start && (
          <Marker
            latitude={route.start.lat}
            longitude={route.start.lng}
            anchor="center"
          >
            <div
              className="size-3 rounded-full border-2 border-background shadow"
              style={{ backgroundColor: colors.startPoint }}
            />
          </Marker>
        )}
        {route.finish && (
          <Marker
            latitude={route.finish.lat}
            longitude={route.finish.lng}
            anchor="center"
          >
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
