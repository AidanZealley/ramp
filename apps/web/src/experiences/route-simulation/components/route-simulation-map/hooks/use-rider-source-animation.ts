import { useCallback, useEffect, useRef } from "react"
import type { RefObject } from "react"
import type { MapRef } from "@vis.gl/react-maplibre"
import type { GeoJSONSource } from "maplibre-gl"
import { buildRiderGeojson } from "@/components/route/route-map/utils"
import type { RoutePoint, RoutePosition } from "@/lib/routes/types"
import {
  RIDER_DISTANCE_ARRIVAL_EPSILON_METERS,
  RIDER_DISTANCE_MAX_GAP_MS,
  RIDER_DISTANCE_MAX_SPEED_MPS,
  RIDER_DISTANCE_MIN_SPEED_MPS,
  RIDER_DISTANCE_SEEK_THRESHOLD_METERS,
  RIDER_SOURCE_ID,
} from "../constants"
import type { RiderDistanceAnimationState } from "../types"
import {
  clamp,
  clampDistanceToRoute,
  getRoutePositionAtDistance,
} from "../utils"

type UseRiderSourceAnimationArgs = {
  mapRef: RefObject<MapRef | null>
  mapStyle: string
  riderDistanceMeters: number
  routePoints: Array<RoutePoint>
}

export const useRiderSourceAnimation = ({
  mapRef,
  mapStyle,
  riderDistanceMeters,
  routePoints,
}: UseRiderSourceAnimationArgs) => {
  const riderDistanceAnimationRef = useRef<RiderDistanceAnimationState>({
    animationFrame: null,
    lastFrameTimestamp: null,
    lastTargetDistanceMeters: null,
    lastTargetTimestamp: null,
    renderedDistanceMeters: null,
    speedMetersPerSecond: RIDER_DISTANCE_MIN_SPEED_MPS,
    targetDistanceMeters: null,
  })

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
      const source = mapRef.current
        ?.getMap()
        .getSource(RIDER_SOURCE_ID) as unknown as GeoJSONSource | undefined

      if (!source?.setData) return false

      source.setData(buildRiderGeojson(position))
      return true
    },
    [mapRef]
  )

  useEffect(() => {
    cancelRiderAnimation()
  }, [cancelRiderAnimation, mapStyle])

  useEffect(() => {
    const source = mapRef.current?.getMap().getSource(RIDER_SOURCE_ID) as
      | GeoJSONSource
      | undefined
    if (!source?.setData) return

    if (routePoints.length < 1) {
      cancelRiderAnimation()
      setRiderSourcePosition(null)
      resetRiderDistanceAnimation()
      return
    }

    const animationState = riderDistanceAnimationRef.current
    const targetDistance = clampDistanceToRoute(routePoints, riderDistanceMeters)
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
    mapRef,
    resetRiderDistanceAnimation,
    riderDistanceMeters,
    routePoints,
    setRiderSourcePosition,
  ])

  useEffect(() => cancelRiderAnimation, [cancelRiderAnimation])
}
