import { useCallback, useEffect, useMemo } from "react"
import type { RefObject } from "react"
import type { MapRef } from "@vis.gl/react-maplibre"
import type { RouteBounds, RoutePosition } from "@/lib/routes/types"

type UseRouteMapBoundsArgs = {
  bounds: RouteBounds | null
  containerRef: RefObject<HTMLDivElement | null>
  mapRef: RefObject<MapRef | null>
  padding: number
  start: RoutePosition | null
}

export const useRouteMapBounds = ({
  bounds,
  containerRef,
  mapRef,
  padding,
  start,
}: UseRouteMapBoundsArgs) => {
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
        padding,
        duration: 0,
        pitch: 0,
        bearing: 0,
      }
    )
  }, [bounds, mapRef, padding])

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
  }, [containerRef, fitRouteBounds])

  return { fitRouteBounds, initialViewState }
}
