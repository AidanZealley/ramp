import { useId } from "react"
import { getZoneGradientStops } from "@/lib/zones"
import {
  buildDividerXs,
  buildSegmentShapes,
  getChartMaxPower,
  getFtpY,
  getPowerScale,
  getTotalDuration,
  VIEW_BOX_HEIGHT,
  VIEW_BOX_WIDTH,
} from "./utils"
import type { WorkoutMiniProps } from "./types"

export const WorkoutMini = ({
  intervals,
  className = "",
  compact = false,
  powerScalePercent = 100,
  "aria-label": ariaLabel,
  showDividers = true,
  showFtpLine = false,
  highlightedIntervalIndex = null,
  reducedIntervalIndexes = [],
}: WorkoutMiniProps) => {
  const gradientIdPrefix = useId()
  const svgGradientIdPrefix = gradientIdPrefix.replace(/:/g, "")
  const dividerMaskId = `${svgGradientIdPrefix}-divider-mask`
  const minHeight = compact ? undefined : 48

  if (intervals.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/50 ${className}`}
        style={{ minHeight }}
      >
        <span className="text-xs text-muted-foreground">No intervals</span>
      </div>
    )
  }

  const powerScale = getPowerScale(powerScalePercent)
  const maxPower = getChartMaxPower(intervals, powerScale)
  const totalDuration = getTotalDuration(intervals)

  if (totalDuration === 0) return null

  const ftpY = getFtpY(maxPower)
  const shouldShowFtpLine = showFtpLine && ftpY >= 0 && ftpY <= VIEW_BOX_HEIGHT
  const reducedIndexes = new Set(reducedIntervalIndexes)
  const segmentShapes = buildSegmentShapes({
    intervals,
    maxPower,
    powerScale,
    totalDuration,
    svgGradientIdPrefix,
    highlightedIntervalIndex,
    reducedIndexes,
  })
  const gradientSegments = segmentShapes.filter(
    (segment) => segment.scaledStartPower !== segment.scaledEndPower
  )
  const dividerXs = showDividers ? buildDividerXs(intervals, totalDuration) : []
  const shouldMaskDividers = dividerXs.length > 0

  return (
    <svg
      aria-label={ariaLabel}
      viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ minHeight }}
    >
      {(gradientSegments.length > 0 || shouldMaskDividers) && (
        <defs>
          {gradientSegments.map((segment) => (
            <linearGradient
              key={segment.index}
              id={`${svgGradientIdPrefix}-segment-${segment.index}`}
              x1="0%"
              x2="100%"
              y1="0%"
              y2="0%"
            >
              {getZoneGradientStops(
                segment.scaledStartPower,
                segment.scaledEndPower
              ).map(({ color, position }, stopIndex) => (
                <stop
                  key={`${position}-${stopIndex}`}
                  offset={`${position}%`}
                  stopColor={color}
                />
              ))}
            </linearGradient>
          ))}
          {shouldMaskDividers && (
            <mask
              id={dividerMaskId}
              x={0}
              y={0}
              width={VIEW_BOX_WIDTH}
              height={VIEW_BOX_HEIGHT}
              maskUnits="userSpaceOnUse"
            >
              <rect
                x={0}
                y={0}
                width={VIEW_BOX_WIDTH}
                height={VIEW_BOX_HEIGHT}
                fill="white"
              />
              {dividerXs.map((x, index) => (
                <line
                  key={`gap-mask-${index}`}
                  x1={x}
                  x2={x}
                  y1={0}
                  y2={VIEW_BOX_HEIGHT}
                  stroke="black"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </mask>
          )}
        </defs>
      )}
      <g mask={shouldMaskDividers ? `url(#${dividerMaskId})` : undefined}>
        {segmentShapes.map((segment) => (
          <polygon
            key={segment.index}
            data-testid={`workout-mini-segment-${segment.index}`}
            points={segment.points}
            fill={segment.fill}
            fillOpacity={segment.opacity}
          />
        ))}
      </g>
      {shouldShowFtpLine && (
        <line
          data-testid="workout-mini-ftp-line"
          x1={0}
          x2={VIEW_BOX_WIDTH}
          y1={ftpY}
          y2={ftpY}
          stroke="currentColor"
          strokeDasharray="4 4"
          strokeWidth={1}
          className="text-foreground opacity-35"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}
