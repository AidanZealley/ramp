import { useCallback, useEffect, useMemo, useRef } from "react"
import Map, { Layer, Marker, Source, type MapRef } from "@vis.gl/react-maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import type { FeatureCollection, LineString } from "geojson"
import { useTheme } from "@/components/theme-provider"
import type { RouteBounds, RoutePosition } from "@/lib/routes/types"
import type { RouteMapViewMode } from "@/experiences/route-simulation/types"
import { routeMapStyleUrls, routeMapTheme } from "./colors"

type RouteMapProps = {
  geojson: FeatureCollection<LineString>
  bounds: RouteBounds | null
  className?: string
  followPosition?: boolean
  onRouteClick?: (position: RoutePosition) => void
  riderPosition?: RoutePosition | null
  start: RoutePosition | null
  terrainEnabled?: boolean
  viewMode?: RouteMapViewMode
  finish: RoutePosition | null
}

const ROUTE_PADDING_PX = 40
const PERSPECTIVE_PITCH = 60
const PERSPECTIVE_ZOOM_FLOOR = 15.5
const CAMERA_DURATION_MS = 450
const TERRAIN_SOURCE_ID = "route-terrain-dem"
const TERRAIN_TILE_URL =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
const TERRAIN_ATTRIBUTION =
  '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Terrain data</a>'

const toRadians = (degrees: number) => (degrees * Math.PI) / 180
const toDegrees = (radians: number) => (radians * 180) / Math.PI

const getBearing = (from: RoutePosition, to: RoutePosition) => {
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)
  const deltaLng = toRadians(to.lng - from.lng)
  const y = Math.sin(deltaLng) * Math.cos(toLat)
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng)

  return (toDegrees(Math.atan2(y, x)) + 360) % 360
}

const distanceSquared = (a: RoutePosition, b: RoutePosition) => {
  const latDelta = a.lat - b.lat
  const lngDelta = a.lng - b.lng
  return latDelta * latDelta + lngDelta * lngDelta
}

const computeRouteBearingNearPosition = (
  geojson: FeatureCollection<LineString>,
  position: RoutePosition
) => {
  let best: {
    distance: number
    bearing: number
  } | null = null

  for (const feature of geojson.features) {
    const coordinates = feature.geometry.coordinates
    for (let index = 0; index < coordinates.length - 1; index += 1) {
      const [fromLng, fromLat] = coordinates[index] ?? []
      const [toLng, toLat] = coordinates[index + 1] ?? []
      if (
        fromLat === undefined ||
        fromLng === undefined ||
        toLat === undefined ||
        toLng === undefined
      ) {
        continue
      }

      const from = { lat: fromLat, lng: fromLng }
      const to = { lat: toLat, lng: toLng }
      const midpoint = {
        lat: (from.lat + to.lat) / 2,
        lng: (from.lng + to.lng) / 2,
      }
      const distance = distanceSquared(position, midpoint)
      if (!best || distance < best.distance) {
        best = { distance, bearing: getBearing(from, to) }
      }
    }
  }

  return best?.bearing ?? null
}

export const RouteMap = ({
  className,
  followPosition = false,
  geojson,
  bounds,
  onRouteClick,
  riderPosition,
  start,
  terrainEnabled = false,
  viewMode = "top-down",
  finish,
}: RouteMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapRef>(null)
  const previousBearingRef = useRef(0)
  const previousViewModeRef = useRef<RouteMapViewMode>(viewMode)
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
      pitch: viewMode === "perspective" ? PERSPECTIVE_PITCH : 0,
      bearing: 0,
    }
  }, [bounds, start, viewMode])

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
        pitch: viewMode === "perspective" ? PERSPECTIVE_PITCH : 0,
        bearing: 0,
      }
    )
  }, [bounds, viewMode])

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
    if (!mapRef.current) return
    const previousViewMode = previousViewModeRef.current
    previousViewModeRef.current = viewMode

    if (viewMode === "top-down") {
      previousBearingRef.current = 0
      if (previousViewMode === "top-down" && !followPosition) {
        return
      }
      mapRef.current.easeTo({
        ...(followPosition && riderPosition
          ? {
              center: [riderPosition.lng, riderPosition.lat] as [
                number,
                number,
              ],
            }
          : {}),
        pitch: 0,
        bearing: 0,
        duration: CAMERA_DURATION_MS,
      })
      return
    }

    const bearing =
      riderPosition === null || riderPosition === undefined
        ? previousBearingRef.current
        : (computeRouteBearingNearPosition(geojson, riderPosition) ??
          previousBearingRef.current)
    previousBearingRef.current = bearing

    if (!riderPosition) {
      mapRef.current.easeTo({
        pitch: PERSPECTIVE_PITCH,
        bearing: 0,
        duration: CAMERA_DURATION_MS,
      })
      return
    }

    mapRef.current.easeTo({
      center: [riderPosition.lng, riderPosition.lat],
      ...(previousViewMode === viewMode
        ? { zoom: Math.max(mapRef.current.getZoom(), PERSPECTIVE_ZOOM_FLOOR) }
        : {}),
      pitch: PERSPECTIVE_PITCH,
      bearing,
      duration: CAMERA_DURATION_MS,
    })
  }, [followPosition, geojson, riderPosition, viewMode])

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
        terrain={
          terrainEnabled
            ? { source: TERRAIN_SOURCE_ID, exaggeration: 2.5 }
            : undefined
        }
        sky={
          terrainEnabled || viewMode === "perspective"
            ? {
                "sky-color": "#8ab4f8",
                "sky-horizon-blend": 0.35,
                "horizon-color": "#f8fafc",
                "horizon-fog-blend": 0.55,
                "fog-color": "#f8fafc",
                "fog-ground-blend": 0.35,
              }
            : undefined
        }
        onLoad={fitRouteBounds}
        onClick={(event) => {
          onRouteClick?.({
            lat: event.lngLat.lat,
            lng: event.lngLat.lng,
          })
        }}
      >
        {terrainEnabled && (
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
        )}
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
