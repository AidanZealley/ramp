import { useEffect, useRef } from "react"
import type { Interval } from "@/lib/workout-utils"
import type { TimelineScale } from "@/hooks/use-timeline-scale"

interface UseEditorAutoScrollProps {
  intervals: Array<Interval>
  selectedIds: Array<string>
  stableIds: Array<string>
  scale: TimelineScale
  pixelsPerSecond: number
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
}

export function useEditorAutoScroll({
  intervals,
  selectedIds,
  stableIds,
  scale,
  pixelsPerSecond,
  scrollContainerRef,
}: UseEditorAutoScrollProps) {
  const prevIntervalCountRef = useRef(intervals.length)

  useEffect(() => {
    if (intervals.length > prevIntervalCountRef.current) {
      const container = scrollContainerRef.current
      if (container && selectedIds.length > 0) {
        const insertIndices = selectedIds
          .map((id) => stableIds.indexOf(id))
          .filter((index) => index >= 0)

        if (insertIndices.length > 0) {
          const insertIndex = Math.min(...insertIndices)
          const x = scale.getIntervalX(insertIndex)
          const intervalWidth =
            intervals[insertIndex]?.durationSeconds * pixelsPerSecond
          const target = x + intervalWidth / 2 - container.clientWidth / 2
          container.scrollTo({ left: Math.max(0, target), behavior: "smooth" })
        } else {
          container.scrollTo({
            left: container.scrollWidth,
            behavior: "smooth",
          })
        }
      }
    }
    prevIntervalCountRef.current = intervals.length
  }, [
    intervals,
    pixelsPerSecond,
    scale,
    scrollContainerRef,
    selectedIds,
    stableIds,
  ])
}
