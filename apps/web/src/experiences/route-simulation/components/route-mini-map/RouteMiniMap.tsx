import { useCallback, useEffect, useMemo, useRef } from "react"
import Map from "@vis.gl/react-maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import type { MapRef } from "@vis.gl/react-maplibre"
import type { ParsedRouteGpx, RoutePosition } from "@/lib/routes/types"
import { RouteEndpointMarkers } from "@/components/route/route-map/components/route-endpoint-markers"
import { RouteLineSource } from "@/components/route/route-map/components/route-line-source"
import { RouteRiderSource } from "@/components/route/route-map/components/route-rider-source"
import { useRouteMapStyle } from "@/components/route/route-map/hooks/use-route-map-style"
import { buildRiderGeojson } from "@/components/route/route-map/utils"
import { interpolateRoutePointByDistance } from "@/lib/routes/simulation"

type RouteMiniMapProps = {
  onRouteClick: (position: RoutePosition) => void
  riderDistanceMeters: number
  riderPosition: RoutePosition | null
  route: ParsedRouteGpx
}

const ROUTE_PADDING_PX = 24

export const RouteMiniMap = ({
  onRouteClick,
  riderDistanceMeters,
  riderPosition,
  route,
}: RouteMiniMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapRef>(null)
  const { colors, mapStyle } = useRouteMapStyle()
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
        <RouteLineSource colors={colors} geojson={route.geojson} />
        <RouteRiderSource colors={colors} data={riderGeojson} />
        <RouteEndpointMarkers
          colors={colors}
          start={route.start}
          finish={route.finish}
        />
      </Map>
    </div>
  )
}
