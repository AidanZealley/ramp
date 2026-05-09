import { useWorkoutEditorSelectedIds } from "../store"
import type { TimelineScale } from "@/hooks/use-timeline-scale"
import type { Interval } from "@/lib/workout-utils"
import { EDITOR_HEIGHT } from "@/lib/timeline/types"

interface ReorderInsertionIndicatorProps {
  activeId: string
  overId: string
  stableIds: Array<string>
  intervals: Array<Interval>
  scale: TimelineScale
}

export function ReorderInsertionIndicator({
  activeId,
  overId,
  stableIds,
  intervals,
  scale,
}: ReorderInsertionIndicatorProps) {
  const selectedIds = useWorkoutEditorSelectedIds()
  const activeIndex = stableIds.indexOf(activeId)
  const overIndex = stableIds.indexOf(overId)

  if (activeIndex === -1 || overIndex === -1 || activeId === overId) {
    return null
  }

  const selectedIdSet = new Set(selectedIds)
  const groupIds = selectedIdSet.has(activeId)
    ? stableIds.filter((id) => selectedIdSet.has(id))
    : [activeId]
  const groupIdSet = new Set(groupIds)

  if (groupIdSet.has(overId) || groupIds.length === 0) {
    return null
  }

  const groupFirstIndex = Math.min(
    ...groupIds.map((id) => stableIds.indexOf(id)).filter((index) => index >= 0)
  )
  const isMovingRight = groupFirstIndex < overIndex
  const overInterval = intervals[overIndex]
  const left = isMovingRight
    ? scale.getIntervalX(overIndex) + scale.getIntervalWidth(overInterval)
    : scale.getIntervalX(overIndex)

  return (
    <div
      className="pointer-events-none absolute top-0 z-30 w-0.5 bg-foreground shadow-[0_0_0_1px_var(--color-background)]"
      style={{
        left,
        height: EDITOR_HEIGHT,
      }}
      aria-hidden="true"
    />
  )
}
