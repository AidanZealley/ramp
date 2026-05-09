import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  useWorkoutEditorDisplayIntervals,
  useWorkoutEditorSelectedIds,
  useWorkoutEditorStableIds,
} from "../store"
import { WorkoutMini } from "@/components/workout-mini"

const MINIMAP_MIN_WIDTH = 120

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

interface EditorMinimapProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  pixelsPerSecond: number
  edgeGutterPx: number
}

export function EditorMinimap({
  scrollContainerRef,
  pixelsPerSecond,
  edgeGutterPx,
}: EditorMinimapProps) {
  const intervals = useWorkoutEditorDisplayIntervals()
  const selectedIds = useWorkoutEditorSelectedIds()
  const stableIds = useWorkoutEditorStableIds()

  const minimapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    dragging: boolean
    grabOffset: number
    rectLeft: number
  } | null>(null)

  const [containerWidth, setContainerWidth] = useState(0)
  const [scrollState, setScrollState] = useState({
    scrollLeft: 0,
    clientWidth: 0,
    scrollWidth: 0,
  })

  useEffect(() => {
    const el = minimapRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    const update = () => {
      setScrollState({
        scrollLeft: el.scrollLeft,
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
      })
    }

    update()
    el.addEventListener("scroll", update, { passive: true })

    const observer = new ResizeObserver(update)
    observer.observe(el)

    return () => {
      el.removeEventListener("scroll", update)
      observer.disconnect()
    }
  }, [scrollContainerRef])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const id = requestAnimationFrame(() => {
      setScrollState({
        scrollLeft: el.scrollLeft,
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
      })
    })
    return () => cancelAnimationFrame(id)
  }, [pixelsPerSecond, scrollContainerRef])

  const { scrollLeft, clientWidth, scrollWidth } = scrollState

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const hasSelection = selectedIds.length > 0

  const totalDuration = useMemo(
    () =>
      intervals.reduce((sum, interval) => sum + interval.durationSeconds, 0),
    [intervals]
  )

  const minimapWidth = Math.max(containerWidth, MINIMAP_MIN_WIDTH)
  const workoutScrollWidth = Math.max(0, scrollWidth - edgeGutterPx * 2)
  const viewportWorkoutLeft = Math.max(0, scrollLeft - edgeGutterPx)
  const hiddenLeftGutter = Math.max(0, edgeGutterPx - scrollLeft)
  const hiddenRightGutter = Math.max(
    0,
    scrollLeft + clientWidth - (edgeGutterPx + workoutScrollWidth)
  )
  const visibleWorkoutWidth = Math.max(
    0,
    Math.min(
      workoutScrollWidth - viewportWorkoutLeft,
      clientWidth - hiddenLeftGutter - hiddenRightGutter
    )
  )
  const viewportWidthPx =
    workoutScrollWidth > 0
      ? (visibleWorkoutWidth / workoutScrollWidth) * minimapWidth
      : minimapWidth
  const viewportScreenLeft =
    workoutScrollWidth > 0
      ? (viewportWorkoutLeft / workoutScrollWidth) * minimapWidth
      : 0

  const clampedViewportLeft = clamp(viewportScreenLeft, 0, minimapWidth)
  const clampedViewportWidth = clamp(
    viewportWidthPx,
    0,
    minimapWidth - clampedViewportLeft
  )

  const setScrollFromViewportLeft = useCallback(
    (desiredViewportLeft: number) => {
      if (!scrollContainerRef.current) return

      if (workoutScrollWidth <= visibleWorkoutWidth) {
        scrollContainerRef.current.scrollLeft = edgeGutterPx
        return
      }

      const maxViewportLeft = Math.max(
        0,
        minimapWidth - clampedViewportWidth
      )
      const clampedDesiredLeft = clamp(
        desiredViewportLeft,
        0,
        maxViewportLeft
      )
      const workoutLeft =
        minimapWidth > 0
          ? (clampedDesiredLeft / minimapWidth) * workoutScrollWidth
          : 0
      scrollContainerRef.current.scrollLeft = edgeGutterPx + workoutLeft
    },
    [
      clampedViewportWidth,
      edgeGutterPx,
      minimapWidth,
      scrollContainerRef,
      visibleWorkoutWidth,
      workoutScrollWidth,
    ]
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragRef.current?.dragging) return
      const { grabOffset, rectLeft } = dragRef.current
      const cursorX = event.clientX - rectLeft
      const desiredViewportLeft = cursorX - grabOffset
      setScrollFromViewportLeft(desiredViewportLeft)
    },
    [setScrollFromViewportLeft]
  )

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    event.currentTarget.releasePointerCapture(event.pointerId)
    dragRef.current = null
  }, [])

  const handleViewportPointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.stopPropagation()
      const rect = minimapRef.current?.getBoundingClientRect()
      if (!rect) return
      event.currentTarget.setPointerCapture(event.pointerId)
      const cursorX = event.clientX - rect.left
      dragRef.current = {
        dragging: true,
        grabOffset: cursorX - clampedViewportLeft,
        rectLeft: rect.left,
      }
    },
    [clampedViewportLeft]
  )

  const handleBackgroundPointerDown = useCallback(
    (event: React.PointerEvent) => {
      const rect = minimapRef.current?.getBoundingClientRect()
      if (!rect || !scrollContainerRef.current) return

      const cursorX = event.clientX - rect.left
      const desiredViewportLeft = cursorX - clampedViewportWidth / 2
      setScrollFromViewportLeft(desiredViewportLeft)

      event.currentTarget.setPointerCapture(event.pointerId)
      dragRef.current = {
        dragging: true,
        grabOffset: clampedViewportWidth / 2,
        rectLeft: rect.left,
      }
    },
    [clampedViewportWidth, scrollContainerRef, setScrollFromViewportLeft]
  )

  return (
    <div
      ref={minimapRef}
      data-testid="editor-minimap"
      className="relative h-6 w-full cursor-pointer overflow-hidden"
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        data-testid="editor-minimap-content"
        className="pointer-events-none absolute inset-y-0 left-0 h-full"
        style={{
          width: minimapWidth,
        }}
      >
        <WorkoutMini
          intervals={intervals}
          className="h-full"
          compact
        />

        {hasSelection && totalDuration > 0 && (
          <svg
            data-testid="editor-minimap-selection-mask"
            viewBox="0 0 200 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            {(() => {
              const viewBoxWidth = 200
              const viewBoxHeight = 100
              let x = 0
              return intervals.map((interval, index) => {
                const width =
                  (interval.durationSeconds / totalDuration) * viewBoxWidth
                const rectX = x
                x += width
                if (selectedIdSet.has(stableIds[index] ?? "")) return null
                return (
                  <rect
                    key={index}
                    x={rectX}
                    y={0}
                    width={width}
                    height={viewBoxHeight}
                    fill="black"
                    opacity={0.4}
                  />
                )
              })
            })()}
          </svg>
        )}
      </div>

      <div
        data-testid="editor-minimap-viewport"
        className="absolute inset-y-0 cursor-grab rounded-sm border border-foreground/25 bg-foreground/10 active:cursor-grabbing"
        style={{
          left: clampedViewportLeft,
          width: clampedViewportWidth,
        }}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  )
}
