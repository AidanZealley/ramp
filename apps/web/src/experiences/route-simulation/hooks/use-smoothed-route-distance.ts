import { useEffect, useRef, useState } from "react"

const MIN_RIDER_SMOOTHING_MS = 120
const MAX_RIDER_SMOOTHING_MS = 750
const RIDER_SMOOTHING_SEEK_THRESHOLD_METERS = 100
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export function useSmoothedRouteDistance(distanceMeters: number): number {
  const [displayDistanceMeters, setDisplayDistanceMeters] =
    useState(distanceMeters)
  const animationFrameRef = useRef<number | null>(null)
  const displayDistanceRef = useRef(distanceMeters)
  const lastTargetAtMsRef = useRef<number | null>(null)

  useEffect(() => {
    displayDistanceRef.current = displayDistanceMeters
  }, [displayDistanceMeters])

  useEffect(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    const now = performance.now()
    const previousTargetAtMs = lastTargetAtMsRef.current
    lastTargetAtMsRef.current = now

    const fromDistanceMeters = displayDistanceRef.current
    const distanceDeltaMeters = Math.abs(distanceMeters - fromDistanceMeters)

    if (
      previousTargetAtMs === null ||
      distanceDeltaMeters >= RIDER_SMOOTHING_SEEK_THRESHOLD_METERS
    ) {
      displayDistanceRef.current = distanceMeters
      setDisplayDistanceMeters(distanceMeters)
      return
    }

    const durationMs = clamp(
      now - previousTargetAtMs,
      MIN_RIDER_SMOOTHING_MS,
      MAX_RIDER_SMOOTHING_MS
    )

    const tick = () => {
      const progress = clamp((performance.now() - now) / durationMs, 0, 1)
      const nextDistanceMeters =
        fromDistanceMeters + (distanceMeters - fromDistanceMeters) * progress
      displayDistanceRef.current = nextDistanceMeters
      setDisplayDistanceMeters(nextDistanceMeters)

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(tick)
      } else {
        animationFrameRef.current = null
      }
    }

    animationFrameRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [distanceMeters])

  return displayDistanceMeters
}
