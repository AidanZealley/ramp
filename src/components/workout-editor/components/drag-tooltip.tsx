import type { Interval } from "@/lib/workout-utils"
import { formatDuration, formatPower, clamp } from "@/lib/workout-utils"
import type { TimelineScale } from "@/hooks/use-timeline-scale"
import type { DragType } from "@/lib/timeline/types"

interface DragTooltipProps {
  activeDrag: { type: DragType; index: number }
  intervals: Interval[]
  scale: TimelineScale
  powerMode: "absolute" | "percentage"
  containerWidth: number
}

/**
 * Floating tooltip that shows the live value being edited during a drag.
 * Absolutely positioned within the editor container.
 */
export function DragTooltip({
  activeDrag,
  intervals,
  scale,
  powerMode,
  containerWidth,
}: DragTooltipProps) {
  const interval = intervals[activeDrag.index]
  if (!interval) return null

  const x = scale.getIntervalX(activeDrag.index)
  const w = scale.getIntervalWidth(interval)

  let labelX: number
  let labelY: number
  let label: string

  switch (activeDrag.type) {
    case "power-uniform":
      labelX = x + w / 2
      labelY =
        Math.min(
          scale.powerToY(interval.startPower),
          scale.powerToY(interval.endPower)
        ) - 20
      label =
        interval.startPower === interval.endPower
          ? formatPower(interval.startPower, powerMode)
          : `${formatPower(interval.startPower, powerMode)}–${formatPower(interval.endPower, powerMode)}`
      break
    case "power-start":
      labelX = x
      labelY = scale.powerToY(interval.startPower) - 20
      label = formatPower(interval.startPower, powerMode)
      break
    case "power-end":
      labelX = x + w
      labelY = scale.powerToY(interval.endPower) - 20
      label = formatPower(interval.endPower, powerMode)
      break
    case "duration":
      labelX = x + w
      labelY =
        scale.powerToY(Math.max(interval.startPower, interval.endPower)) - 20
      label = formatDuration(interval.durationSeconds)
      break
    case "duration-left":
      labelX = x
      labelY =
        scale.powerToY(Math.max(interval.startPower, interval.endPower)) - 20
      label = formatDuration(interval.durationSeconds)
      break
    default:
      return null
  }

  // Keep the badge inside the container
  const BADGE_HALF = 24
  labelX = clamp(labelX, BADGE_HALF, containerWidth - BADGE_HALF)

  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        left: labelX,
        top: labelY,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="rounded bg-foreground/90 px-2 py-0.5 text-[10px] font-medium text-background tabular-nums">
        {label}
      </div>
    </div>
  )
}
