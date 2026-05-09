import type { TimelineScale } from "@/hooks/use-timeline-scale"
import type { Interval } from "@/lib/workout-utils"
import { EDITOR_HEIGHT } from "@/lib/timeline/types"
import { getZoneGradient } from "@/lib/zones"

interface ReorderDragOverlayProps {
  activeId: string
  intervals: Array<Interval>
  stableIds: Array<string>
  selectedIds: Array<string>
  scale: TimelineScale
}

export function ReorderDragOverlay({
  activeId,
  intervals,
  stableIds,
  selectedIds,
  scale,
}: ReorderDragOverlayProps) {
  const selectedIdSet = new Set(selectedIds)
  const groupRows = selectedIdSet.has(activeId)
    ? stableIds
        .map((id, index) =>
          selectedIdSet.has(id) ? { id, interval: intervals[index] } : null
        )
        .filter((row): row is { id: string; interval: Interval } => row !== null)
    : stableIds
        .map((id, index) =>
          id === activeId ? { id, interval: intervals[index] } : null
        )
        .filter((row): row is { id: string; interval: Interval } => row !== null)

  if (groupRows.length === 0) return null

  const widths = groupRows.map(({ interval }) => scale.getIntervalWidth(interval))
  const activeGroupIndex = groupRows.findIndex((row) => row.id === activeId)
  const activeOffset = widths
    .slice(0, Math.max(0, activeGroupIndex))
    .reduce((sum, width) => sum + width, 0)
  const totalWidth = widths.reduce((sum, width) => sum + width, 0)
  let left = 0

  return (
    <div
      style={{
        position: "relative",
        width: totalWidth,
        height: EDITOR_HEIGHT,
        opacity: 0.88,
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
        transform: `translateX(${-activeOffset}px)`,
      }}
    >
      {groupRows.map(({ id, interval }, index) => {
        const width = widths[index]
        const displayWidth = Math.max(1, width - 1)
        const x = left
        left += width

        const startYPx = scale.powerToY(interval.startPower)
        const endYPx = scale.powerToY(interval.endPower)
        const startPowerPct = (startYPx / EDITOR_HEIGHT) * 100
        const endPowerPct = (endYPx / EDITOR_HEIGHT) * 100

        return (
          <div
            key={id}
            className="absolute top-0"
            style={{
              left: x,
              width: displayWidth,
              height: EDITOR_HEIGHT,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                clipPath: `polygon(0% ${startPowerPct}%, 100% ${endPowerPct}%, 100% 100%, 0% 100%)`,
                background: getZoneGradient(
                  interval.startPower,
                  interval.endPower
                ),
                opacity: 0.85,
              }}
            />
            <svg
              className="pointer-events-none absolute inset-0"
              width={displayWidth}
              height={EDITOR_HEIGHT}
              style={{ overflow: "visible" }}
            >
              <polygon
                points={`0,${startYPx} ${displayWidth},${endYPx} ${displayWidth},${EDITOR_HEIGHT} 0,${EDITOR_HEIGHT}`}
                fill="none"
                stroke="var(--color-foreground)"
                strokeOpacity={0.75}
                strokeWidth={2}
              />
            </svg>
          </div>
        )
      })}
    </div>
  )
}
