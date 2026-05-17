import { useCallback, useEffect, useRef } from "react"
import type { RefObject } from "react"
import type { MapRef } from "@vis.gl/react-maplibre"
import type { GeoJSONSource } from "maplibre-gl"
import { buildRiderGeojson } from "@/components/route/route-map/utils"
import type { RoutePoint, RoutePosition } from "@/lib/routes/types"
import {
  RIDER_RENDER_ARRIVAL_EPSILON_METERS,
  RIDER_RENDER_EXTRAPOLATION_MAX_MS,
  RIDER_RENDER_MAX_GAP_MS,
  RIDER_RENDER_MAX_SPEED_MPS,
  RIDER_RENDER_MIN_SPEED_MPS,
  RIDER_RENDER_SEEK_THRESHOLD_METERS,
  RIDER_SOURCE_ID,
} from "../constants"
import type {
  RiderDistanceSample,
  RiderRenderedPositionSnapshot,
  RouteDistanceCursor,
} from "../types"
import {
  clamp,
  clampDistanceToRoute,
  getRoutePositionAtDistanceWithCursor,
} from "../utils"

type UseRenderedRiderPositionArgs = {
  mapRef: RefObject<MapRef | null>
  mapStyle: string
  riderDistanceMeters: number
  routePoints: Array<RoutePoint>
  paused?: boolean
  onRenderedPositionChange: (snapshot: RiderRenderedPositionSnapshot) => void
}

type RenderState = {
  animationFrame: number | null
  lastFrameTimestamp: number | null
  latestSample: RiderDistanceSample | null
  previousSample: RiderDistanceSample | null
  renderedDistanceMeters: number | null
  cursor: RouteDistanceCursor
}

export const useRenderedRiderPosition = ({
  mapRef,
  mapStyle,
  riderDistanceMeters,
  routePoints,
  paused = false,
  onRenderedPositionChange,
}: UseRenderedRiderPositionArgs) => {
  const onRenderedPositionChangeRef = useRef(onRenderedPositionChange)
  const renderStateRef = useRef<RenderState>({
    animationFrame: null,
    lastFrameTimestamp: null,
    latestSample: null,
    previousSample: null,
    renderedDistanceMeters: null,
    cursor: { segmentIndex: 0 },
  })

  useEffect(() => {
    onRenderedPositionChangeRef.current = onRenderedPositionChange
  }, [onRenderedPositionChange])

  const cancelFrame = useCallback(() => {
    const frame = renderStateRef.current.animationFrame
    if (frame !== null) {
      window.cancelAnimationFrame(frame)
      renderStateRef.current.animationFrame = null
    }
  }, [])

  const resetState = useCallback(() => {
    const state = renderStateRef.current
    state.lastFrameTimestamp = null
    state.latestSample = null
    state.previousSample = null
    state.renderedDistanceMeters = null
    state.cursor = { segmentIndex: 0 }
  }, [])

  const setRiderSourcePosition = useCallback(
    (position: RoutePosition | null | undefined) => {
      const source = mapRef.current
        ?.getMap()
        .getSource(RIDER_SOURCE_ID) as unknown as GeoJSONSource | undefined

      if (!source?.setData) return false

      source.setData(buildRiderGeojson(position))
      return true
    },
    [mapRef]
  )

  const publishRenderedDistance = useCallback(
    (distanceMeters: number, snapped: boolean, timestampMs: number) => {
      const state = renderStateRef.current
      const position = getRoutePositionAtDistanceWithCursor({
        routePoints,
        distanceMeters,
        cursor: state.cursor,
      })

      state.renderedDistanceMeters = distanceMeters
      setRiderSourcePosition(position)
      onRenderedPositionChangeRef.current({
        distanceMeters,
        position,
        snapped,
        timestampMs,
      })
    },
    [routePoints, setRiderSourcePosition]
  )

  useEffect(() => {
    cancelFrame()
    resetState()
    onRenderedPositionChangeRef.current({
      distanceMeters: 0,
      position: null,
      snapped: true,
      timestampMs: performance.now(),
    })
  }, [cancelFrame, mapStyle, resetState, routePoints])

  useEffect(() => {
    if (routePoints.length < 1) {
      cancelFrame()
      resetState()
      setRiderSourcePosition(null)
      return
    }

    const state = renderStateRef.current
    const distanceMeters = clampDistanceToRoute(routePoints, riderDistanceMeters)
    const timestampMs = performance.now()
    const previousSample = state.latestSample
    const renderedDistance = state.renderedDistanceMeters
    const targetGapMeters =
      renderedDistance === null
        ? 0
        : Math.abs(distanceMeters - renderedDistance)
    const sampleGapMs =
      previousSample === null ? 0 : timestampMs - previousSample.timestampMs
    const shouldSnap =
      previousSample === null ||
      renderedDistance === null ||
      sampleGapMs > RIDER_RENDER_MAX_GAP_MS ||
      targetGapMeters > RIDER_RENDER_SEEK_THRESHOLD_METERS ||
      distanceMeters < renderedDistance

    const intervalSeconds = Math.max(sampleGapMs / 1000, 0.001)
    const sampleDeltaMeters =
      previousSample === null
        ? 0
        : Math.max(distanceMeters - previousSample.distanceMeters, 0)
    const speedMetersPerSecond = shouldSnap
      ? 0
      : clamp(
          sampleDeltaMeters / intervalSeconds,
          RIDER_RENDER_MIN_SPEED_MPS,
          RIDER_RENDER_MAX_SPEED_MPS
        )

    const latestSample = {
      distanceMeters,
      timestampMs,
      speedMetersPerSecond,
    }
    state.previousSample = previousSample
    state.latestSample = latestSample

    if (shouldSnap) {
      state.lastFrameTimestamp = null
      publishRenderedDistance(distanceMeters, true, timestampMs)
    }
  }, [
    cancelFrame,
    publishRenderedDistance,
    resetState,
    riderDistanceMeters,
    routePoints,
    setRiderSourcePosition,
  ])

  useEffect(() => {
    if (paused || routePoints.length < 1) return

    const animate = (timestampMs: number) => {
      const state = renderStateRef.current
      const sample = state.latestSample
      const renderedDistance = state.renderedDistanceMeters

      if (sample === null || renderedDistance === null) {
        state.lastFrameTimestamp = timestampMs
        state.animationFrame = window.requestAnimationFrame(animate)
        return
      }

      const deltaSeconds =
        state.lastFrameTimestamp === null
          ? 0
          : Math.max((timestampMs - state.lastFrameTimestamp) / 1000, 0)
      state.lastFrameTimestamp = timestampMs
      const ageMs = timestampMs - sample.timestampMs
      const extrapolationMs = clamp(ageMs, 0, RIDER_RENDER_EXTRAPOLATION_MAX_MS)
      const desiredDistance =
        renderedDistance + RIDER_RENDER_ARRIVAL_EPSILON_METERS <
        sample.distanceMeters
          ? sample.distanceMeters
          : sample.distanceMeters +
            (sample.speedMetersPerSecond * extrapolationMs) / 1000
      const targetDistance = clampDistanceToRoute(routePoints, desiredDistance)
      const stepMeters = sample.speedMetersPerSecond * deltaSeconds
      const nextDistance =
        Math.abs(targetDistance - renderedDistance) <=
        RIDER_RENDER_ARRIVAL_EPSILON_METERS
          ? targetDistance
          : Math.min(targetDistance, renderedDistance + stepMeters)

      if (nextDistance !== renderedDistance) {
        publishRenderedDistance(nextDistance, false, timestampMs)
      }

      state.animationFrame = window.requestAnimationFrame(animate)
    }

    renderStateRef.current.animationFrame =
      window.requestAnimationFrame(animate)

    return cancelFrame
  }, [cancelFrame, paused, publishRenderedDistance, routePoints])

  useEffect(() => cancelFrame, [cancelFrame])
}
