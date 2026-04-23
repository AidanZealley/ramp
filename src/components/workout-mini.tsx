import type { Interval } from "@/lib/workout-utils"
import { getZoneColor } from "@/lib/zones"

interface WorkoutMiniProps {
  intervals: Interval[]
  ftp: number
  powerMode: "absolute" | "percentage"
  className?: string
}

export function WorkoutMini({
  intervals,
  ftp,
  powerMode,
  className = "",
}: WorkoutMiniProps) {
  if (intervals.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/50 ${className}`}
        style={{ minHeight: 48 }}
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

  let currentX = 0

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ minHeight: 48 }}
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
        const color = getZoneColor(avgPower, ftp, powerMode)

        return (
          <polygon
            key={i}
            points={`${x},${y1} ${x + w},${y2} ${x + w},${viewBoxHeight} ${x},${viewBoxHeight}`}
            fill={color}
            fillOpacity={0.75}
          />
        )
      })}
    </svg>
  )
}
