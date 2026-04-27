import { useCallback, useMemo } from "react"
import type { Interval } from "@/lib/workout-utils"
import { useTimelineScale } from "@/hooks/use-timeline-scale"
import { useTimelineZoom } from "@/hooks/use-timeline-zoom"
import { TIMELINE_EDGE_GUTTER } from "@/lib/timeline/types"

interface UseEditorZoomProps {
  displayIntervals: Interval[]
  selectedIds: string[]
  stableIds: string[]
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
}

export function useEditorZoom({
  displayIntervals,
  selectedIds,
  stableIds,
  scrollContainerRef,
}: UseEditorZoomProps) {
  const totalDurationSec = useMemo(
    () =>
      displayIntervals.reduce(
        (sum, interval) => sum + interval.durationSeconds,
        0
      ),
    [displayIntervals]
  )

  const zoom = useTimelineZoom({
    totalDurationSec,
    containerRef: scrollContainerRef,
    edgeGutterPx: TIMELINE_EDGE_GUTTER,
  })

  const scale = useTimelineScale(displayIntervals, zoom.pixelsPerSecond)

  const getToolbarZoomFocalX = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return undefined

    if (selectedIds.length > 0) {
      const indices = selectedIds
        .map((id) => stableIds.indexOf(id))
        .filter((index) => index >= 0)
      if (indices.length > 0) {
        const leftmost = Math.min(...indices)
        const rightmost = Math.max(...indices)
        const leftX = scale.getIntervalX(leftmost)
        const rightX =
          scale.getIntervalX(rightmost) +
          (displayIntervals[rightmost]?.durationSeconds ?? 0) *
            zoom.pixelsPerSecond
        return (leftX + rightX) / 2
      }
    }

    return el.scrollLeft + el.clientWidth / 2
  }, [
    displayIntervals,
    scale,
    scrollContainerRef,
    selectedIds,
    stableIds,
    zoom.pixelsPerSecond,
  ])

  const toolbarZoom = useMemo(
    () => ({
      ...zoom,
      zoomIn: () => zoom.zoomIn(getToolbarZoomFocalX()),
      zoomOut: () => zoom.zoomOut(getToolbarZoomFocalX()),
    }),
    [getToolbarZoomFocalX, zoom]
  )

  return { totalDurationSec, zoom, toolbarZoom, scale }
}
