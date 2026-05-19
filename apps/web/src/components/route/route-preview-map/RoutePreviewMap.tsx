import { useCallback, useEffect, useMemo, useRef } from "react"
import Map from "@vis.gl/react-maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import type { MapRef } from "@vis.gl/react-maplibre"
import type { FeatureCollection, LineString } from "geojson"
import type { RouteBounds, RoutePosition } from "@/lib/routes/types"
import { RouteEndpointMarkers } from "@/components/route/route-map/components/route-endpoint-markers"
import { RouteLineSource } from "@/components/route/route-map/components/route-line-source"
import { useRouteMapStyle } from "@/components/route/route-map/hooks/use-route-map-style"

type RoutePreviewMapProps = {
  geojson: FeatureCollection<LineString>
  bounds: RouteBounds | null
  start: RoutePosition | null
  finish: RoutePosition | null
  className?: string
}

const ROUTE_PADDING_PX = 40

export const RoutePreviewMap = ({
  className,
  geojson,
  bounds,
  start,
  finish,
}: RoutePreviewMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapRef>(null)
  const { colors, mapStyle } = useRouteMapStyle()
  const initialViewState = useMemo(() => {
    const center = start ?? { lat: 39.5, lng: -98.35 }
    return {
      latitude: center.lat,
      longitude: center.lng,
      zoom: bounds ? 10 : 3,
      pitch: 0,
      bearing: 0,
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
      {
        padding: ROUTE_PADDING_PX,
        duration: 0,
        pitch: 0,
        bearing: 0,
      }
    )
  }, [bounds])

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
      className={
        className ??
        "h-[420px] overflow-hidden rounded-lg border border-border/70 bg-muted"
      }
    >
      <Map
        ref={mapRef}
        mapStyle={mapStyle}
        initialViewState={initialViewState}
        attributionControl={false}
        reuseMaps
        onLoad={fitRouteBounds}
      >
        <RouteLineSource colors={colors} geojson={geojson} />
        <RouteEndpointMarkers colors={colors} start={start} finish={finish} />
      </Map>
    </div>
  )
}
