import type { ElevationSample } from "@/lib/routes/types"

type RouteElevationMinimapProps = {
  distanceMeters: number
  riderElevationMeters?: number | null
  samples: Array<ElevationSample>
  totalDistanceMeters: number
}

const formatCurrentElevation = (elevationMeters: number | null | undefined) => {
  if (
    elevationMeters === null ||
    elevationMeters === undefined ||
    !Number.isFinite(elevationMeters)
  ) {
    return "--"
  }

  return `${Math.round(elevationMeters).toLocaleString()} m`
}

export const RouteElevationMinimap = ({
  distanceMeters,
  riderElevationMeters,
  samples,
  totalDistanceMeters,
}: RouteElevationMinimapProps) => {
  const currentElevation = formatCurrentElevation(riderElevationMeters)

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

  const min = Math.min(...samples.map((sample) => sample.elevationMeters))
  const max = Math.max(...samples.map((sample) => sample.elevationMeters))
  const range = max - min || 1
  const points = samples
    .map((sample) => {
      const x = (sample.distanceMeters / totalDistanceMeters) * 100
      const y = 100 - ((sample.elevationMeters - min) / range) * 100
      return `${x},${y}`
    })
    .join(" ")
  const markerX = Math.min(
    100,
    Math.max(0, (distanceMeters / totalDistanceMeters) * 100)
  )

  return (
    <div className="absolute top-16 right-3 h-28 w-48 rounded-lg border border-border/70 bg-card/95 p-2 shadow-lg sm:top-20 sm:right-5 sm:w-64">
      <svg
        viewBox="0 0 100 100"
        className="h-20 w-full"
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={markerX}
          x2={markerX}
          y1="0"
          y2="100"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex items-center justify-between border-t border-border/50 pt-1 text-[10px] leading-none">
        <span className="text-muted-foreground">Elevation</span>
        <span className="font-medium text-foreground tabular-nums">
          {currentElevation}
        </span>
      </div>
    </div>
  )
}
