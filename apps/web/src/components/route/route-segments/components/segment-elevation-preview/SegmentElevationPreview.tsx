type SegmentElevationPreviewProps = {
  samples: Array<{
    distanceMeters: number
    elevationMeters: number
  }>
}

export const SegmentElevationPreview = ({
  samples,
}: SegmentElevationPreviewProps) => {
  if (samples.length < 2) {
    return <div className="h-16 rounded-md bg-muted" aria-hidden="true" />
  }

  const minDistance = samples[0].distanceMeters
  const maxDistance = samples[samples.length - 1].distanceMeters
  const minElevation = Math.min(
    ...samples.map((sample) => sample.elevationMeters)
  )
  const maxElevation = Math.max(
    ...samples.map((sample) => sample.elevationMeters)
  )
  const distanceSpan = Math.max(1, maxDistance - minDistance)
  const elevationSpan = Math.max(1, maxElevation - minElevation)
  const points = samples
    .map((sample) => {
      const x = ((sample.distanceMeters - minDistance) / distanceSpan) * 100
      const y =
        56 - ((sample.elevationMeters - minElevation) / elevationSpan) * 48
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")
  const firstX = points.split(" ")[0]?.split(",")[0] ?? "0"
  const lastX = points.split(" ").at(-1)?.split(",")[0] ?? "100"
  const areaPoints = `${firstX},60 ${points} ${lastX},60`

  return (
    <svg
      viewBox="0 0 100 64"
      preserveAspectRatio="none"
      className="h-16 w-full rounded-md bg-muted"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="routeSegmentElevation"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#routeSegmentElevation)" />
      <polyline
        points={points}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
