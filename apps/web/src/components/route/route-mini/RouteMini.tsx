import type { RoutePreviewPoint } from "@/lib/routes/types"

type RouteMiniProps = {
  previewPoints: Array<RoutePreviewPoint>
  className?: string
  "aria-label"?: string
}

export const RouteMini = ({
  previewPoints,
  className = "",
  "aria-label": ariaLabel = "Route preview",
}: RouteMiniProps) => {
  if (previewPoints.length < 2) {
    return (
      <div
        className={`flex min-h-12 items-center justify-center bg-muted/50 ${className}`}
      >
        <span className="text-xs text-muted-foreground">No preview</span>
      </div>
    )
  }

  const viewBoxWidth = 200
  const viewBoxHeight = 80
  const padding = 8
  const path = previewPoints
    .map((point, index) => {
      const x = padding + point.x * (viewBoxWidth - padding * 2)
      const y = padding + point.y * (viewBoxHeight - padding * 2)
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(" ")

  return (
    <svg
      aria-label={ariaLabel}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="xMidYMid meet"
      className={`w-full ${className}`}
      style={{ minHeight: 48 }}
    >
      <path
        d={path}
        fill="none"
        stroke="color-mix(in oklch, var(--primary) 82%, var(--foreground))"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={padding + previewPoints[0].x * (viewBoxWidth - padding * 2)}
        cy={padding + previewPoints[0].y * (viewBoxHeight - padding * 2)}
        r={3}
        fill="var(--background)"
        stroke="var(--primary)"
        strokeWidth={2}
      />
      <circle
        cx={
          padding +
          previewPoints[previewPoints.length - 1].x *
            (viewBoxWidth - padding * 2)
        }
        cy={
          padding +
          previewPoints[previewPoints.length - 1].y *
            (viewBoxHeight - padding * 2)
        }
        r={3}
        fill="var(--primary)"
      />
    </svg>
  )
}
