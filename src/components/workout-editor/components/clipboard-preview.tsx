import type { Interval } from "@/lib/workout-utils"
import { getZoneColor } from "@/lib/zones"

/** Fixed gap width in viewBox units between non-contiguous clipboard items */
const GAP_WIDTH = 8

interface ClipboardPreviewProps {
  clipboardIntervals: Interval[]
  gapBefore: boolean[]
  ftp: number
  powerMode: "absolute" | "percentage"
}

export function ClipboardPreview({
  clipboardIntervals,
  gapBefore,
  ftp,
  powerMode,
}: ClipboardPreviewProps) {
  if (clipboardIntervals.length === 0) return null

  const maxPower = Math.max(
    ...clipboardIntervals.flatMap((i) => [i.startPower, i.endPower]),
    1
  )
  const totalDuration = clipboardIntervals.reduce(
    (sum, i) => sum + i.durationSeconds,
    0
  )
  if (totalDuration === 0) return null

  const gapCount = gapBefore.filter(Boolean).length
  const durationWidth = 100
  const viewBoxWidth = durationWidth + gapCount * GAP_WIDTH
  const viewBoxHeight = 100

  let currentX = 0

  return (
    <div
      className="flex h-6 max-w-16 items-center rounded-md border border-border/50 bg-muted/30 px-1"
      title={`Clipboard: ${clipboardIntervals.length} interval${clipboardIntervals.length === 1 ? "" : "s"}`}
    >
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        {clipboardIntervals.map((interval, i) => {
          // Insert gap divider before this interval if there's a gap
          if (gapBefore[i]) {
            const gapX = currentX
            currentX += GAP_WIDTH

            const x = currentX
            const w = (interval.durationSeconds / totalDuration) * durationWidth
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
              <g key={i}>
                {/* Gap divider — dotted line */}
                <line
                  x1={gapX + GAP_WIDTH / 2}
                  y1={viewBoxHeight * 0.15}
                  x2={gapX + GAP_WIDTH / 2}
                  y2={viewBoxHeight * 0.85}
                  stroke="currentColor"
                  strokeOpacity={0.3}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
                {/* Interval polygon */}
                <polygon
                  points={`${x},${y1} ${x + w},${y2} ${x + w},${viewBoxHeight} ${x},${viewBoxHeight}`}
                  fill={color}
                  fillOpacity={0.75}
                />
              </g>
            )
          }

          // No gap — just the interval
          const x = currentX
          const w = (interval.durationSeconds / totalDuration) * durationWidth
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
    </div>
  )
}
