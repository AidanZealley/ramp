import { useState, useCallback, useRef, useEffect } from "react"
import type { Interval } from "@/lib/workout-utils"
import { snap, clamp, computeMaxPower } from "@/lib/workout-utils"
import type { DragType } from "@/lib/timeline/types"
import {
  EDITOR_HEIGHT,
  MIN_POWER,
  MIN_DURATION,
  DURATION_SNAP,
} from "@/lib/timeline/types"

interface UseIntervalDragConfig {
  intervals: Interval[]
  pixelsPerSecond: number
  onPreviewChange: (preview: Interval[] | null) => void
  onCommit: (intervals: Interval[]) => void
}

interface DragState {
  type: DragType
  index: number
}

/**
 * Custom pointer-based drag system for resizing intervals (duration)
 * and adjusting power values (start/end/uniform).
 *
 * Uses Pointer Events for unified mouse+touch handling.
 * Separate from dnd-kit, which handles reorder-drag.
 */
export function useIntervalDrag({
  intervals,
  pixelsPerSecond,
  onPreviewChange,
  onCommit,
}: UseIntervalDragConfig) {
  const [activeDrag, setActiveDrag] = useState<DragState | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current()
    }
  }, [])

  const powerSnap = 1

  const startDrag = useCallback(
    (e: React.PointerEvent, type: DragType, index: number) => {
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const startY = e.clientY
      const original = intervals.map((i) => ({ ...i }))
      // Capture maxPower at drag start for consistent delta calculations
      const dragMaxPower = computeMaxPower(original)

      let latestPreview: Interval[] | null = null

      const handleMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        const newIntervals = original.map((i) => ({ ...i }))

        switch (type) {
          case "power-uniform": {
            const powerDelta = (-dy * dragMaxPower) / EDITOR_HEIGHT
            newIntervals[index].startPower = clamp(
              snap(original[index].startPower + powerDelta, powerSnap),
              MIN_POWER,
              dragMaxPower
            )
            newIntervals[index].endPower = clamp(
              snap(original[index].endPower + powerDelta, powerSnap),
              MIN_POWER,
              dragMaxPower
            )
            break
          }
          case "power-start": {
            const powerDelta = (-dy * dragMaxPower) / EDITOR_HEIGHT
            newIntervals[index].startPower = clamp(
              snap(original[index].startPower + powerDelta, powerSnap),
              MIN_POWER,
              dragMaxPower
            )
            break
          }
          case "power-end": {
            const powerDelta = (-dy * dragMaxPower) / EDITOR_HEIGHT
            newIntervals[index].endPower = clamp(
              snap(original[index].endPower + powerDelta, powerSnap),
              MIN_POWER,
              dragMaxPower
            )
            break
          }
          case "duration": {
            const durationDelta = dx / pixelsPerSecond
            newIntervals[index].durationSeconds = Math.max(
              MIN_DURATION,
              snap(
                original[index].durationSeconds + durationDelta,
                DURATION_SNAP
              )
            )
            break
          }
          case "duration-left": {
            // Move the left edge so it follows the cursor, mirroring how the
            // right edge works. Dragging right shrinks the current interval
            // from the left; the previous interval absorbs the freed space
            // (and vice-versa). Without this, the block's `left` position
            // (set by preceding intervals) stays fixed while only the width
            // changes, so the edge appears stuck in the viewport.
            if (index === 0) break // no previous interval to absorb the delta

            const durationDelta = dx / pixelsPerSecond
            const prevDuration = original[index - 1].durationSeconds
            const currDuration = original[index].durationSeconds

            // Snap the new current duration the same way the right edge does
            const newCurrDuration = Math.max(
              MIN_DURATION,
              snap(currDuration - durationDelta, DURATION_SNAP)
            )

            // How much the current interval actually changed (may differ from
            // raw delta due to snapping / clamping)
            const actualDelta = currDuration - newCurrDuration

            // Previous interval absorbs the same change in the opposite direction
            const newPrevDuration = Math.max(
              MIN_DURATION,
              prevDuration + actualDelta
            )

            newIntervals[index].durationSeconds = newCurrDuration
            newIntervals[index - 1].durationSeconds = newPrevDuration
            break
          }
        }

        latestPreview = newIntervals
        onPreviewChange(newIntervals)
      }

      const handleUp = () => {
        if (latestPreview) {
          onCommit(latestPreview)
        }
        onPreviewChange(null)
        setActiveDrag(null)
        cleanup()

        // Suppress the synthetic click the browser fires after pointerup.
        // Without this, the click bubbles to IntervalBlock's onClick and
        // toggles the selection off on every drag-end.
        window.addEventListener("click", (e) => e.stopPropagation(), {
          capture: true,
          once: true,
        })
      }

      const cleanup = () => {
        window.removeEventListener("pointermove", handleMove)
        window.removeEventListener("pointerup", handleUp)
        cleanupRef.current = null
      }

      window.addEventListener("pointermove", handleMove)
      window.addEventListener("pointerup", handleUp)
      cleanupRef.current = cleanup

      setActiveDrag({ type, index })
    },
    [
      intervals,
      pixelsPerSecond,
      powerSnap,
      onPreviewChange,
      onCommit,
    ]
  )

  return { activeDrag, startDrag }
}
