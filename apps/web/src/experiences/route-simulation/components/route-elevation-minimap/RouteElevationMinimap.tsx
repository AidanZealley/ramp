import { useEffect, useMemo, useRef, useState } from "react"
import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { ElevationSample } from "@/lib/routes/types"
import {
  formatElevationMeters,
  formatDistanceMeters,
  metersToDisplayDistance,
  type UnitSystem,
} from "@/lib/units"
import { useUnitFormatters } from "@/hooks/use-unit-formatters"

type RouteElevationMinimapProps = {
  distanceMeters: number
  riderElevationMeters?: number | null
  samples: Array<ElevationSample>
  totalDistanceMeters: number
}

type ElevationWindow = {
  startMeters: number
  endMeters: number
}

type ElevationDomain = {
  minMeters: number
  maxMeters: number
}

type AnimatedViewport = {
  window: ElevationWindow
  domain: ElevationDomain
}

const ANIMATION_DURATION_MS = 220
const ELEVATION_TOP_PADDING_RATIO = 0.14
const ZOOM_VERTICAL_EXAGGERATION = [
  { maxWindowMeters: 100, scale: 2.25 },
  { maxWindowMeters: 250, scale: 1.9 },
  { maxWindowMeters: 1000, scale: 1.55 },
  { maxWindowMeters: 2000, scale: 1.35 },
  { maxWindowMeters: 5000, scale: 1.15 },
]

const clamp = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}

const getSafeTotalDistance = (
  totalDistanceMeters: number,
  samples: Array<ElevationSample>
) => {
  if (Number.isFinite(totalDistanceMeters) && totalDistanceMeters > 0) {
    return totalDistanceMeters
  }

  const maxSampleDistance = Math.max(
    0,
    ...samples
      .map((sample) => sample.distanceMeters)
      .filter((distance) => Number.isFinite(distance))
  )

  return maxSampleDistance > 0 ? maxSampleDistance : 1
}

const getEffectiveZoomTargets = (totalDistanceMeters: number) => {
  if (!Number.isFinite(totalDistanceMeters) || totalDistanceMeters <= 0) {
    return [Number.POSITIVE_INFINITY]
  }

  const detailWindowMeters = Math.max(1, Math.round(totalDistanceMeters / 4))

  if (detailWindowMeters >= totalDistanceMeters) {
    return [Number.POSITIVE_INFINITY]
  }

  return [Number.POSITIVE_INFINITY, detailWindowMeters]
}

const formatZoomWindowLabel = (
  windowMeters: number,
  totalDistanceMeters: number,
  unitSystem: UnitSystem
) => {
  if (
    windowMeters === Number.POSITIVE_INFINITY ||
    windowMeters >= totalDistanceMeters
  ) {
    return "All"
  }

  if (unitSystem === "metric" && windowMeters < 1000) {
    return formatDistanceMeters(windowMeters, unitSystem, {
      compactUnderKm: true,
    })
  }

  const display = metersToDisplayDistance(windowMeters, unitSystem)
  return `${Number(display.value.toFixed(display.value >= 10 ? 0 : 1))} ${display.unit}`
}

const getElevationWindow = (
  distanceMeters: number,
  totalDistanceMeters: number,
  windowMeters: number
): ElevationWindow => {
  const routeDistance = Number.isFinite(totalDistanceMeters)
    ? Math.max(totalDistanceMeters, 1)
    : 1
  const windowDistance =
    windowMeters === Number.POSITIVE_INFINITY
      ? routeDistance
      : clamp(windowMeters, 1, routeDistance)
  const clampedDistanceMeters = clamp(distanceMeters, 0, routeDistance)

  if (windowDistance >= routeDistance) {
    return { startMeters: 0, endMeters: routeDistance }
  }

  const riderAnchor = 0.2
  const desiredStart = clampedDistanceMeters - windowDistance * riderAnchor
  const maxStart = routeDistance - windowDistance
  const startMeters = clamp(desiredStart, 0, maxStart)

  return {
    startMeters,
    endMeters: startMeters + windowDistance,
  }
}

const getVisibleSamples = (
  samples: Array<ElevationSample>,
  window: ElevationWindow
) => {
  const validSamples = samples.filter(
    (sample) =>
      Number.isFinite(sample.distanceMeters) &&
      Number.isFinite(sample.elevationMeters)
  )
  const visibleSamples = validSamples.filter(
    (sample) =>
      sample.distanceMeters >= window.startMeters &&
      sample.distanceMeters <= window.endMeters
  )
  const beforeSample = validSamples
    .filter((sample) => sample.distanceMeters < window.startMeters)
    .at(-1)
  const afterSample = validSamples.find(
    (sample) => sample.distanceMeters > window.endMeters
  )

  return [beforeSample, ...visibleSamples, afterSample].filter(
    (sample): sample is ElevationSample => Boolean(sample)
  )
}

const getVerticalExaggeration = (
  windowMeters: number,
  totalDistanceMeters: number
) => {
  if (
    windowMeters === Number.POSITIVE_INFINITY ||
    windowMeters >= totalDistanceMeters
  ) {
    return 1
  }

  return (
    ZOOM_VERTICAL_EXAGGERATION.find(
      ({ maxWindowMeters }) => windowMeters <= maxWindowMeters
    )?.scale ?? 1
  )
}

const getElevationDomain = (
  samples: Array<ElevationSample>,
  verticalExaggeration = 1
) => {
  const elevations = samples
    .map((sample) => sample.elevationMeters)
    .filter((elevation) => Number.isFinite(elevation))

  if (elevations.length === 0) {
    return { minMeters: 0, maxMeters: 1 }
  }

  const minMeters = Math.min(...elevations)
  const maxMeters = Math.max(...elevations)
  const addTopPadding = (domain: ElevationDomain): ElevationDomain => {
    const rangeMeters = domain.maxMeters - domain.minMeters || 1

    return {
      minMeters: domain.minMeters,
      maxMeters: domain.maxMeters + rangeMeters * ELEVATION_TOP_PADDING_RATIO,
    }
  }

  if (maxMeters !== minMeters && verticalExaggeration > 1) {
    const midpointMeters = (minMeters + maxMeters) / 2
    const halfRangeMeters = (maxMeters - minMeters) / 2 / verticalExaggeration

    return addTopPadding({
      minMeters: midpointMeters - halfRangeMeters,
      maxMeters: midpointMeters + halfRangeMeters,
    })
  }

  return addTopPadding({
    minMeters,
    maxMeters: maxMeters === minMeters ? minMeters + 1 : maxMeters,
  })
}

const projectSampleToSvg = (
  sample: ElevationSample,
  window: ElevationWindow,
  domain: ElevationDomain
) => {
  const windowRange = window.endMeters - window.startMeters || 1
  const elevationRange = domain.maxMeters - domain.minMeters || 1
  const x = clamp(
    ((sample.distanceMeters - window.startMeters) / windowRange) * 100,
    0,
    100
  )
  const y = clamp(
    100 - ((sample.elevationMeters - domain.minMeters) / elevationRange) * 100,
    0,
    100
  )

  return `${x},${y}`
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

const getTargetViewport = (
  distanceMeters: number,
  samples: Array<ElevationSample>,
  totalDistanceMeters: number,
  windowMeters: number
): AnimatedViewport => {
  const safeTotalDistance = getSafeTotalDistance(totalDistanceMeters, samples)
  const window = getElevationWindow(
    distanceMeters,
    safeTotalDistance,
    windowMeters
  )

  return {
    window,
    domain: getElevationDomain(
      samples,
      getVerticalExaggeration(windowMeters, safeTotalDistance)
    ),
  }
}

const formatCurrentElevation = (
  elevationMeters: number | null | undefined,
  unitSystem: UnitSystem
) => {
  if (
    elevationMeters === null ||
    elevationMeters === undefined ||
    !Number.isFinite(elevationMeters)
  ) {
    return "--"
  }

  return formatElevationMeters(elevationMeters, unitSystem)
}

export const RouteElevationMinimap = ({
  distanceMeters,
  riderElevationMeters,
  samples,
  totalDistanceMeters,
}: RouteElevationMinimapProps) => {
  const units = useUnitFormatters()
  const currentElevation = formatCurrentElevation(
    riderElevationMeters,
    units.unitSystem
  )
  const safeTotalDistance = getSafeTotalDistance(totalDistanceMeters, samples)
  const zoomTargets = useMemo(
    () => getEffectiveZoomTargets(safeTotalDistance),
    [safeTotalDistance]
  )
  const [zoomIndex, setZoomIndex] = useState(0)
  const selectedWindowMeters =
    zoomTargets[Math.min(zoomIndex, zoomTargets.length - 1)] ??
    Number.POSITIVE_INFINITY
  const targetViewport = useMemo(
    () =>
      getTargetViewport(
        distanceMeters,
        samples,
        safeTotalDistance,
        selectedWindowMeters
      ),
    [distanceMeters, samples, safeTotalDistance, selectedWindowMeters]
  )
  const [animatedViewport, setAnimatedViewport] =
    useState<AnimatedViewport>(targetViewport)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (zoomIndex <= zoomTargets.length - 1) {
      return
    }

    setZoomIndex(Math.max(0, zoomTargets.length - 1))
  }, [zoomIndex, zoomTargets.length])

  useEffect(() => {
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current)
    }

    const startViewport = animatedViewport
    let startTime: number | null = null

    const animate = (timestamp: number) => {
      startTime ??= timestamp
      const progress = clamp(
        (timestamp - startTime) / ANIMATION_DURATION_MS,
        0,
        1
      )
      const easedProgress = easeOutCubic(progress)
      const interpolate = (start: number, end: number) =>
        start + (end - start) * easedProgress

      setAnimatedViewport({
        window: {
          startMeters: interpolate(
            startViewport.window.startMeters,
            targetViewport.window.startMeters
          ),
          endMeters: interpolate(
            startViewport.window.endMeters,
            targetViewport.window.endMeters
          ),
        },
        domain: {
          minMeters: interpolate(
            startViewport.domain.minMeters,
            targetViewport.domain.minMeters
          ),
          maxMeters: interpolate(
            startViewport.domain.maxMeters,
            targetViewport.domain.maxMeters
          ),
        },
      })

      if (progress < 1) {
        animationRef.current = window.requestAnimationFrame(animate)
      } else {
        animationRef.current = null
      }
    }

    animationRef.current = window.requestAnimationFrame(animate)

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [targetViewport])

  if (samples.length < 2) {
    return (
      <div className="absolute top-16 right-3 grid h-28 w-48 place-items-center rounded-lg border border-border/70 bg-card/95 p-3 text-xs shadow-lg sm:top-20 sm:right-5">
        <div className="text-center">
          <div className="font-medium text-foreground tabular-nums">
            {currentElevation}
          </div>
          <div className="text-muted-foreground">Elevation unavailable</div>
        </div>
      </div>
    )
  }

  const visibleSamples = getVisibleSamples(samples, animatedViewport.window)
  const chartSamples = visibleSamples.length >= 2 ? visibleSamples : samples
  const linePoints = chartSamples
    .map((sample) =>
      projectSampleToSvg(
        sample,
        animatedViewport.window,
        animatedViewport.domain
      )
    )
    .join(" ")
  const firstX = linePoints.split(" ")[0]?.split(",")[0] ?? "0"
  const lastX = linePoints.split(" ").at(-1)?.split(",")[0] ?? "100"
  const areaPoints = `${firstX},100 ${linePoints} ${lastX},100`
  const clampedDistanceMeters = clamp(distanceMeters, 0, safeTotalDistance)
  const markerX = Math.min(
    100,
    Math.max(
      0,
      ((clampedDistanceMeters - animatedViewport.window.startMeters) /
        (animatedViewport.window.endMeters -
          animatedViewport.window.startMeters || 1)) *
        100
    )
  )
  const zoomLabel = formatZoomWindowLabel(
    selectedWindowMeters,
    safeTotalDistance,
    units.unitSystem
  )
  const canZoomOut = zoomIndex > 0
  const canZoomIn = zoomIndex < zoomTargets.length - 1

  return (
    <div className="absolute top-16 right-3 w-48 rounded-lg border border-border/70 bg-card/95 shadow-lg sm:top-20 sm:right-5 sm:w-64">
      <svg
        viewBox="0 0 100 100"
        className="h-20 w-full"
        preserveAspectRatio="none"
      >
        <polygon points={areaPoints} fill="var(--primary)" opacity="0.18" />
        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={markerX}
          x2={markerX}
          y1="0"
          y2="100"
          stroke="currentColor"
          strokeOpacity="0.75"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex items-center justify-between border-t border-border/50 p-3 text-[10px] leading-none">
        <span className="text-muted-foreground">Elevation</span>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Zoom elevation overview out"
            disabled={!canZoomOut}
            size="icon-xs"
            type="button"
            variant="ghost"
            onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
          >
            <Minus />
          </Button>
          <span
            className="min-w-8 text-center font-medium tabular-nums"
            aria-live="polite"
          >
            {zoomLabel}
          </span>
          <Button
            aria-label="Zoom elevation overview in"
            disabled={!canZoomIn}
            size="icon-xs"
            type="button"
            variant="ghost"
            onClick={() =>
              setZoomIndex((index) =>
                Math.min(zoomTargets.length - 1, index + 1)
              )
            }
          >
            <Plus />
          </Button>
        </div>
        <span className="font-medium text-foreground tabular-nums">
          {currentElevation}
        </span>
      </div>
    </div>
  )
}
