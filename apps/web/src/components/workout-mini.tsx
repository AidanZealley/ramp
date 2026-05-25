import type { Interval } from "@/lib/workout-utils"
import { getZoneColor } from "@/lib/zones"

export interface WorkoutMiniProps {
  intervals: Array<Interval>
  className?: string
  compact?: boolean
  "aria-label"?: string
  showDividers?: boolean
  showFtpLine?: boolean
  highlightedIntervalIndex?: number | null
  reducedIntervalIndexes?: ReadonlyArray<number>
}

export const WorkoutMini = ({
  intervals,
  className = "",
  compact = false,
  "aria-label": ariaLabel,
  showDividers = true,
  showFtpLine = false,
  highlightedIntervalIndex = null,
  reducedIntervalIndexes = [],
}: WorkoutMiniProps) => {
  if (intervals.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/50 ${className}`}
        style={{ minHeight: compact ? undefined : 48 }}
      >
        <span className="text-xs text-muted-foreground">No intervals</span>
      </div>
    )
  }

  const maxPower = Math.max(
    ...intervals.flatMap((i) => [i.startPower, i.endPower]),
    1
  )
  const totalDuration = intervals.reduce((sum, i) => sum + i.durationSeconds, 0)

  if (totalDuration === 0) return null

  const viewBoxHeight = 100
  const viewBoxWidth = 200
  const ftpPower = 100
  const ftpY =
    viewBoxHeight - (ftpPower / (maxPower * 1.15)) * viewBoxHeight
  const shouldShowFtpLine = showFtpLine && ftpY >= 0 && ftpY <= viewBoxHeight
  const reducedIndexes = new Set(reducedIntervalIndexes)

  let currentX = 0

  const getIntervalOpacity = (index: number) => {
    if (highlightedIntervalIndex === index) return 1
    if (reducedIndexes.has(index)) return 0.35
    if (highlightedIntervalIndex !== null) {
      return 0.9
    }
    return 1
  }

  return (
    <svg
      aria-label={ariaLabel}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ minHeight: compact ? undefined : 48 }}
    >
      {intervals.map((interval, i) => {
        const x = currentX
        const w = (interval.durationSeconds / totalDuration) * viewBoxWidth
        currentX += w

        const y1 =
          viewBoxHeight -
          (interval.startPower / (maxPower * 1.15)) * viewBoxHeight
        const y2 =
          viewBoxHeight -
          (interval.endPower / (maxPower * 1.15)) * viewBoxHeight

        const avgPower = (interval.startPower + interval.endPower) / 2
        const color = getZoneColor(avgPower)

        return (
          <polygon
            key={i}
            data-testid={`workout-mini-segment-${i}`}
            points={`${x},${y1} ${x + w},${y2} ${x + w},${viewBoxHeight} ${x},${viewBoxHeight}`}
            fill={color}
            fillOpacity={getIntervalOpacity(i)}
          />
        )
      })}
      {showDividers &&
        intervals.slice(1).map((_, i) => {
          const x =
            intervals
              .slice(0, i + 1)
              .reduce((sum, interval) => sum + interval.durationSeconds, 0) /
            totalDuration

          return (
            <line
              key={`gap-${i}`}
              x1={x * viewBoxWidth}
              x2={x * viewBoxWidth}
              y1={0}
              y2={viewBoxHeight}
            stroke="color-mix(in oklch, var(--background) 70%, transparent)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
      {shouldShowFtpLine && (
        <line
          data-testid="workout-mini-ftp-line"
          x1={0}
          x2={viewBoxWidth}
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
