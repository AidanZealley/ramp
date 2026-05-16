import { useCallback, useEffect, useMemo, useRef } from "react"
import Map, { Layer, Marker, Source } from "@vis.gl/react-maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import {
  DEFAULT_ROUTE_TERRAIN_ENABLED,
  ROUTE_TERRAIN_EXAGGERATION,
} from "./constants"
import { routeMapStyleUrls, routeMapTheme } from "./colors"
import type { MapRef } from "@vis.gl/react-maplibre"
import type { FeatureCollection, LineString, Point } from "geojson"
import type { GeoJSONSource } from "maplibre-gl"
import type { RouteBounds, RoutePoint, RoutePosition } from "@/lib/routes/types"
import type { RouteMapViewMode } from "@/experiences/route-simulation/types"
import { useTheme } from "@/components/theme-provider"
import { interpolateRoutePointByDistance } from "@/lib/routes/simulation"

type MutableMapElevation = {
  _elevationFreeze?: boolean
  transform?: {
    setElevation?: (elevation: number) => void
  }
  triggerRepaint?: () => void
}

type RouteMapProps = {
  geojson: FeatureCollection<LineString>
  bounds: RouteBounds | null
  className?: string
  followPosition?: boolean
  onRouteClick?: (position: RoutePosition) => void
  riderDistanceMeters?: number | null
  riderGradePercent?: number
  riderPosition?: RoutePosition | null
  riderRoutePoints?: Array<RoutePoint>
  start: RoutePosition | null
  terrainEnabled?: boolean
  viewMode?: RouteMapViewMode
  finish: RoutePosition | null
}

const ROUTE_PADDING_PX = 40
const PERSPECTIVE_MIN_PITCH = 48
const PERSPECTIVE_MAX_PITCH = 80
const PERSPECTIVE_MIN_PITCH_ZOOM = 14
const PERSPECTIVE_MAX_PITCH_ZOOM = 18
const PERSPECTIVE_ZOOM_FLOOR = 15.5
const PERSPECTIVE_FOLLOW_OFFSET_PX: [number, number] = [0, 140]
const PERSPECTIVE_GRADE_PITCH_MULTIPLIER = 0.8
const PERSPECTIVE_GRADE_PITCH_RANGE = 10
const CAMERA_DURATION_MS = 450
const CAMERA_MOVE_THRESHOLD_METERS = 2
const CAMERA_BEARING_THRESHOLD_DEGREES = 2
const CAMERA_PITCH_THRESHOLD_DEGREES = 1
const TERRAIN_SOURCE_ID = "route-terrain-dem"
const RIDER_SOURCE_ID = "route-rider"
const RIDER_HALO_LAYER_ID = "route-rider-halo"
const RIDER_DOT_LAYER_ID = "route-rider-dot"
const RIDER_DISTANCE_MAX_GAP_MS = 1000
const RIDER_DISTANCE_SEEK_THRESHOLD_METERS = 25
const RIDER_DISTANCE_MIN_SPEED_MPS = 0.1
const RIDER_DISTANCE_MAX_SPEED_MPS = 30
const RIDER_DISTANCE_ARRIVAL_EPSILON_METERS = 0.05
const TERRAIN_TILE_URL =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
const TERRAIN_ATTRIBUTION =
  '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Terrain data</a>'

const toRadians = (degrees: number) => (degrees * Math.PI) / 180
const toDegrees = (radians: number) => (radians * 180) / Math.PI
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const getPerspectivePitchForZoom = (zoom: number) => {
  const progress = clamp(
    (zoom - PERSPECTIVE_MIN_PITCH_ZOOM) /
      (PERSPECTIVE_MAX_PITCH_ZOOM - PERSPECTIVE_MIN_PITCH_ZOOM),
    0,
    1
  )

  return (
    PERSPECTIVE_MIN_PITCH +
    (PERSPECTIVE_MAX_PITCH - PERSPECTIVE_MIN_PITCH) * progress
  )
}

const getPerspectivePitch = (zoom: number, gradePercent = 0) => {
  const gradePitchOffset = clamp(
    gradePercent * PERSPECTIVE_GRADE_PITCH_MULTIPLIER,
    -PERSPECTIVE_GRADE_PITCH_RANGE,
    PERSPECTIVE_GRADE_PITCH_RANGE
  )

  return clamp(
    getPerspectivePitchForZoom(zoom) + gradePitchOffset,
    PERSPECTIVE_MIN_PITCH,
    PERSPECTIVE_MAX_PITCH
  )
}

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

const distanceMeters = (a: RoutePosition, b: RoutePosition) => {
  const earthRadiusMeters = 6371000
  const latDelta = toRadians(b.lat - a.lat)
  const lngDelta = toRadians(b.lng - a.lng)
  const fromLat = toRadians(a.lat)
  const toLat = toRadians(b.lat)
  const sinLatDelta = Math.sin(latDelta / 2)
  const sinLngDelta = Math.sin(lngDelta / 2)
  const haversine =
    sinLatDelta * sinLatDelta +
    Math.cos(fromLat) * Math.cos(toLat) * sinLngDelta * sinLngDelta

  return (
    earthRadiusMeters *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  )
}

const bearingDeltaDegrees = (a: number, b: number) => {
  const delta = Math.abs(a - b) % 360
  return delta > 180 ? 360 - delta : delta
}

const forceMapCenterElevation = (
  map: MutableMapElevation | undefined,
  elevation: number
) => {
  if (!map?.transform?.setElevation) return

  // MapLibre 5.24.0 can leave center elevation frozen during overlapping
  // follow flights, so perspective follow updates the active transform directly.
  map._elevationFreeze = false
  map.transform.setElevation(elevation)
  map.triggerRepaint?.()
}

type RouteBearingSegment = {
  midpoint: RoutePosition
  bearing: number
}

type CameraTarget = {
  bearing: number
  center?: [number, number]
  followPosition: boolean
  pitch: number
  terrainEnabled: boolean
  viewMode: RouteMapViewMode
}

type RiderDistanceAnimationState = {
  animationFrame: number | null
  lastFrameTimestamp: number | null
  lastTargetDistanceMeters: number | null
  lastTargetTimestamp: number | null
  renderedDistanceMeters: number | null
  speedMetersPerSecond: number
  targetDistanceMeters: number | null
}

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

const clampDistanceToRoute = (
  routePoints: Array<RoutePoint>,
  distanceMeters: number
) => {
  const start = routePoints[0]?.distanceMeters ?? 0
  const end = routePoints.at(-1)?.distanceMeters ?? start
  return clamp(distanceMeters, start, end)
}

const getRoutePositionAtDistance = (
  routePoints: Array<RoutePoint>,
  distanceMeters: number
): RoutePosition | null => {
  return interpolateRoutePointByDistance(routePoints, distanceMeters)
}

const buildRouteBearingSegments = (
  geojson: FeatureCollection<LineString>
): Array<RouteBearingSegment> => {
  const segments: Array<RouteBearingSegment> = []

  for (const feature of geojson.features) {
    const coordinates = feature.geometry.coordinates
    for (let index = 0; index < coordinates.length - 1; index += 1) {
      const [fromLng, fromLat] = coordinates[index] ?? []
      const [toLng, toLat] = coordinates[index + 1] ?? []

      const from = { lat: fromLat, lng: fromLng }
      const to = { lat: toLat, lng: toLng }
      segments.push({
        midpoint: {
          lat: (from.lat + to.lat) / 2,
          lng: (from.lng + to.lng) / 2,
        },
        bearing: getBearing(from, to),
      })
    }
  }

  return segments
}

const computeRouteBearingNearPosition = (
  routeBearingSegments: Array<RouteBearingSegment>,
  position: RoutePosition
) => {
  let best: {
    distance: number
    bearing: number
  } | null = null

  for (const segment of routeBearingSegments) {
    const distance = distanceSquared(position, segment.midpoint)
    if (!best || distance < best.distance) {
      best = { distance, bearing: segment.bearing }
    }
  }

  return best?.bearing ?? null
}

const shouldUpdateCamera = (
  previousTarget: CameraTarget | null,
  nextTarget: CameraTarget
) => {
  if (!previousTarget) return true
  if (previousTarget.viewMode !== nextTarget.viewMode) return true
  if (previousTarget.followPosition !== nextTarget.followPosition) return true
  if (previousTarget.terrainEnabled !== nextTarget.terrainEnabled) return true
  if (
    bearingDeltaDegrees(previousTarget.bearing, nextTarget.bearing) >=
    CAMERA_BEARING_THRESHOLD_DEGREES
  ) {
    return true
  }
  if (
    Math.abs(previousTarget.pitch - nextTarget.pitch) >=
    CAMERA_PITCH_THRESHOLD_DEGREES
  ) {
    return true
  }
  if (previousTarget.center && nextTarget.center) {
    return (
      distanceMeters(
        { lng: previousTarget.center[0], lat: previousTarget.center[1] },
        { lng: nextTarget.center[0], lat: nextTarget.center[1] }
      ) >= CAMERA_MOVE_THRESHOLD_METERS
    )
  }

  return previousTarget.center !== nextTarget.center
}

export const RouteMap = ({
  className,
  followPosition = false,
  geojson,
  bounds,
  onRouteClick,
  riderDistanceMeters,
  riderGradePercent,
  riderPosition,
  riderRoutePoints,
  start,
  terrainEnabled = DEFAULT_ROUTE_TERRAIN_ENABLED,
  viewMode = "top-down",
  finish,
}: RouteMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapRef>(null)
  const previousBearingRef = useRef(0)
  const previousViewModeRef = useRef<RouteMapViewMode>(viewMode)
  const lastCameraTargetRef = useRef<CameraTarget | null>(null)
  const appliedTerrainEnabledRef = useRef<boolean | null>(null)
  const riderDistanceAnimationRef = useRef<RiderDistanceAnimationState>({
    animationFrame: null,
    lastFrameTimestamp: null,
    lastTargetDistanceMeters: null,
    lastTargetTimestamp: null,
    renderedDistanceMeters: null,
    speedMetersPerSecond: RIDER_DISTANCE_MIN_SPEED_MPS,
    targetDistanceMeters: null,
  })
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
      pitch: 0,
      bearing: 0,
    }
  }, [bounds, start])
  const routeBearingSegments = useMemo(
    () => buildRouteBearingSegments(geojson),
    [geojson]
  )
  const initialRiderGeojsonRef = useRef(buildRiderGeojson(riderPosition))
  const isRiderDistanceModeActive =
    riderRoutePoints !== undefined && riderDistanceMeters !== undefined

  const cancelRiderAnimation = useCallback(() => {
    const animationFrame = riderDistanceAnimationRef.current.animationFrame
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame)
      riderDistanceAnimationRef.current.animationFrame = null
    }
  }, [])

  const resetRiderDistanceAnimation = useCallback(() => {
    const animationState = riderDistanceAnimationRef.current
    animationState.lastFrameTimestamp = null
    animationState.lastTargetDistanceMeters = null
    animationState.lastTargetTimestamp = null
    animationState.renderedDistanceMeters = null
    animationState.speedMetersPerSecond = RIDER_DISTANCE_MIN_SPEED_MPS
    animationState.targetDistanceMeters = null
  }, [])

  const setRiderSourcePosition = useCallback(
    (position: RoutePosition | null | undefined) => {
      const source = mapRef.current?.getMap().getSource(RIDER_SOURCE_ID) as
        | GeoJSONSource
        | undefined

      if (!source?.setData) return false

      source.setData(buildRiderGeojson(position))
      return true
    },
    []
  )

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

  const applyTerrain = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    if (!terrainEnabled) {
      if (appliedTerrainEnabledRef.current !== false) {
        map.setTerrain(null)
        appliedTerrainEnabledRef.current = false
      }
      return
    }

    if (!map.getSource(TERRAIN_SOURCE_ID)) return
    if (appliedTerrainEnabledRef.current === true) return

    map.setTerrain({
      source: TERRAIN_SOURCE_ID,
      exaggeration: ROUTE_TERRAIN_EXAGGERATION,
    })
    appliedTerrainEnabledRef.current = true
  }, [terrainEnabled])

  const getPerspectiveTerrainElevation = useCallback(
    (position: RoutePosition) => {
      if (!terrainEnabled) return undefined

      const terrainElevation =
        mapRef.current?.queryTerrainElevation([position.lng, position.lat]) ??
        null

      return terrainElevation !== null && Number.isFinite(terrainElevation)
        ? terrainElevation
        : undefined
    },
    [terrainEnabled]
  )

  const syncPerspectiveCameraElevation = useCallback(() => {
    if (
      viewMode !== "perspective" ||
      !followPosition ||
      !terrainEnabled ||
      !riderPosition
    ) {
      return
    }

    const elevation = getPerspectiveTerrainElevation(riderPosition)
    if (elevation === undefined) return

    const map = mapRef.current?.getMap() as MutableMapElevation | undefined
    forceMapCenterElevation(map, elevation)
  }, [
    followPosition,
    getPerspectiveTerrainElevation,
    riderPosition,
    terrainEnabled,
    viewMode,
  ])

  const handleCameraStateChange = useCallback(() => {
    syncPerspectiveCameraElevation()
  }, [syncPerspectiveCameraElevation])

  const handleMapIdle = useCallback(() => {
    applyTerrain()
    handleCameraStateChange()
  }, [applyTerrain, handleCameraStateChange])

  const handleMapLoad = useCallback(() => {
    fitRouteBounds()
    window.requestAnimationFrame(applyTerrain)
    window.requestAnimationFrame(handleCameraStateChange)
  }, [applyTerrain, fitRouteBounds, handleCameraStateChange])

  const handleSourceData = useCallback(
    (event: { sourceId: string }) => {
      if (event.sourceId !== TERRAIN_SOURCE_ID) return

      applyTerrain()
      handleCameraStateChange()
    },
    [applyTerrain, handleCameraStateChange]
  )

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(fitRouteBounds)

    return () => window.cancelAnimationFrame(animationFrame)
  }, [fitRouteBounds])

  useEffect(() => {
    appliedTerrainEnabledRef.current = null
    cancelRiderAnimation()
  }, [cancelRiderAnimation, mapStyle])

  useEffect(() => {
    if (isRiderDistanceModeActive) return

    cancelRiderAnimation()
    resetRiderDistanceAnimation()
    setRiderSourcePosition(riderPosition)
  }, [
    cancelRiderAnimation,
    isRiderDistanceModeActive,
    mapStyle,
    resetRiderDistanceAnimation,
    riderPosition,
    setRiderSourcePosition,
  ])

  useEffect(() => {
    if (!isRiderDistanceModeActive) return

    const routePoints = riderRoutePoints ?? []
    const map = mapRef.current?.getMap()
    const source = map?.getSource(RIDER_SOURCE_ID) as GeoJSONSource | undefined
    if (!source?.setData) return

    if (riderDistanceMeters === null || routePoints.length < 1) {
      cancelRiderAnimation()
      setRiderSourcePosition(null)
      resetRiderDistanceAnimation()
      return
    }

    const animationState = riderDistanceAnimationRef.current
    const targetDistance = clampDistanceToRoute(
      routePoints,
      riderDistanceMeters
    )
    const now = performance.now()
    const previousTargetDistance = animationState.lastTargetDistanceMeters
    const previousTargetTimestamp = animationState.lastTargetTimestamp
    const renderedDistance = animationState.renderedDistanceMeters
    const shouldSnap =
      previousTargetTimestamp === null ||
      previousTargetDistance === null ||
      renderedDistance === null ||
      now - previousTargetTimestamp > RIDER_DISTANCE_MAX_GAP_MS ||
      Math.abs(targetDistance - renderedDistance) >
        RIDER_DISTANCE_SEEK_THRESHOLD_METERS

    if (shouldSnap) {
      cancelRiderAnimation()
      animationState.renderedDistanceMeters = targetDistance
      animationState.targetDistanceMeters = targetDistance
      animationState.lastTargetDistanceMeters = targetDistance
      animationState.lastTargetTimestamp = now
      animationState.lastFrameTimestamp = null
      setRiderSourcePosition(
        getRoutePositionAtDistance(routePoints, targetDistance)
      )
      return
    }

    const intervalSeconds = Math.max(
      (now - previousTargetTimestamp) / 1000,
      0.001
    )
    const distanceDelta = targetDistance - previousTargetDistance
    animationState.targetDistanceMeters = targetDistance
    animationState.lastTargetDistanceMeters = targetDistance
    animationState.lastTargetTimestamp = now
    animationState.lastFrameTimestamp = now
    animationState.speedMetersPerSecond = clamp(
      Math.abs(distanceDelta) / intervalSeconds,
      RIDER_DISTANCE_MIN_SPEED_MPS,
      RIDER_DISTANCE_MAX_SPEED_MPS
    )

    if (animationState.animationFrame !== null) return

    const animate = (timestamp: number) => {
      const target = animationState.targetDistanceMeters
      const rendered = animationState.renderedDistanceMeters
      if (routePoints.length < 1 || target === null || rendered === null) {
        animationState.animationFrame = null
        animationState.lastFrameTimestamp = null
        return
      }

      const deltaSeconds =
        animationState.lastFrameTimestamp === null
          ? 0
          : Math.max((timestamp - animationState.lastFrameTimestamp) / 1000, 0)
      animationState.lastFrameTimestamp = timestamp

      const remaining = target - rendered
      const direction = Math.sign(remaining)
      const step = animationState.speedMetersPerSecond * deltaSeconds
      const nextDistance =
        Math.abs(remaining) <=
        Math.max(step, RIDER_DISTANCE_ARRIVAL_EPSILON_METERS)
          ? target
          : rendered + direction * step

      animationState.renderedDistanceMeters = nextDistance
      setRiderSourcePosition(
        getRoutePositionAtDistance(routePoints, nextDistance)
      )

      if (nextDistance === target) {
        animationState.animationFrame = null
        animationState.lastFrameTimestamp = null
      } else {
        animationState.animationFrame = window.requestAnimationFrame(animate)
      }
    }

    animationState.animationFrame = window.requestAnimationFrame(animate)

    return cancelRiderAnimation
  }, [
    cancelRiderAnimation,
    isRiderDistanceModeActive,
    mapStyle,
    resetRiderDistanceAnimation,
    riderDistanceMeters,
    riderRoutePoints,
    setRiderSourcePosition,
  ])

  useEffect(() => cancelRiderAnimation, [cancelRiderAnimation])

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

  useEffect(() => {
    if (!mapRef.current) return
    const previousViewMode = previousViewModeRef.current
    previousViewModeRef.current = viewMode

    if (viewMode === "top-down") {
      previousBearingRef.current = 0
      if (previousViewMode === "top-down" && !followPosition) {
        return
      }
      const target: CameraTarget = {
        ...(followPosition && riderPosition
          ? {
              center: [riderPosition.lng, riderPosition.lat] as [
                number,
                number,
              ],
            }
          : {}),
        bearing: 0,
        followPosition,
        pitch: 0,
        terrainEnabled,
        viewMode,
      }
      if (!shouldUpdateCamera(lastCameraTargetRef.current, target)) {
        return
      }
      lastCameraTargetRef.current = target
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
        : (computeRouteBearingNearPosition(
            routeBearingSegments,
            riderPosition
          ) ?? previousBearingRef.current)
    previousBearingRef.current = bearing

    if (!followPosition || !riderPosition) {
      const pitch = getPerspectivePitch(
        mapRef.current.getZoom(),
        riderGradePercent
      )
      const target: CameraTarget = {
        bearing,
        followPosition,
        pitch,
        terrainEnabled,
        viewMode,
      }
      if (!shouldUpdateCamera(lastCameraTargetRef.current, target)) {
        return
      }
      lastCameraTargetRef.current = target
      mapRef.current.easeTo({
        pitch,
        bearing,
        duration: CAMERA_DURATION_MS,
      })
      return
    }

    const zoom = Math.max(mapRef.current.getZoom(), PERSPECTIVE_ZOOM_FLOOR)
    const pitch = getPerspectivePitch(zoom, riderGradePercent)
    const target: CameraTarget = {
      bearing,
      center: [riderPosition.lng, riderPosition.lat],
      followPosition,
      pitch,
      terrainEnabled,
      viewMode,
    }
    if (!shouldUpdateCamera(lastCameraTargetRef.current, target)) {
      return
    }
    lastCameraTargetRef.current = target
    const elevation = getPerspectiveTerrainElevation(riderPosition)

    mapRef.current.flyTo({
      center: [riderPosition.lng, riderPosition.lat],
      ...(elevation !== undefined ? { elevation } : {}),
      offset: PERSPECTIVE_FOLLOW_OFFSET_PX,
      zoom,
      pitch,
      bearing,
      duration: CAMERA_DURATION_MS,
      curve: 1.2,
      maxDuration: CAMERA_DURATION_MS,
      freezeElevation: false,
    })
    syncPerspectiveCameraElevation()
  }, [
    followPosition,
    getPerspectiveTerrainElevation,
    riderGradePercent,
    riderPosition,
    routeBearingSegments,
    syncPerspectiveCameraElevation,
    terrainEnabled,
    viewMode,
  ])

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
        centerClampedToGround={true}
        maxPitch={PERSPECTIVE_MAX_PITCH}
        reuseMaps
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
        onIdle={handleMapIdle}
        onLoad={handleMapLoad}
        onMoveEnd={handleCameraStateChange}
        onSourceData={handleSourceData}
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
        <Source
          id={RIDER_SOURCE_ID}
          type="geojson"
          data={initialRiderGeojsonRef.current}
        >
          <Layer
            id={RIDER_HALO_LAYER_ID}
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
            id={RIDER_DOT_LAYER_ID}
            type="circle"
            paint={{
              "circle-color": colors.routeLine,
              "circle-radius": 5,
              "circle-pitch-alignment": "map",
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
