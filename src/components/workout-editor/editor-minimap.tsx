import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { WorkoutMini } from "@/components/workout-mini"
import {
  useWorkoutEditorDisplayIntervals,
  useWorkoutEditorFtp,
  useWorkoutEditorPowerMode,
  useWorkoutEditorSelectedIds,
  useWorkoutEditorStableIds,
} from "./workout-editor-store"

const MINIMAP_PX_PER_SEC = 0.2
const MINIMAP_MIN_WIDTH = 120

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
  const ftp = useWorkoutEditorFtp()
  const powerMode = useWorkoutEditorPowerMode()
  const selectedIds = useWorkoutEditorSelectedIds()
  const stableIds = useWorkoutEditorStableIds()

  const minimapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    dragging: boolean
    grabOffset: number
    k: number
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
    () => intervals.reduce((sum, interval) => sum + interval.durationSeconds, 0),
    [intervals]
  )

  const contentWidth = Math.max(
    totalDuration * MINIMAP_PX_PER_SEC,
    MINIMAP_MIN_WIDTH
  )

  const overflow = Math.max(0, contentWidth - containerWidth)
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
  const maxViewportWorkoutLeft = Math.max(
    0,
    workoutScrollWidth - visibleWorkoutWidth
  )
  const scrollRatio =
    maxViewportWorkoutLeft > 0 ? viewportWorkoutLeft / maxViewportWorkoutLeft : 0
  const contentOffset = scrollRatio * overflow

  const viewportWidthPx =
    workoutScrollWidth > 0
      ? (visibleWorkoutWidth / workoutScrollWidth) * contentWidth
      : contentWidth
  const viewportContentLeft =
    workoutScrollWidth > 0
      ? (viewportWorkoutLeft / workoutScrollWidth) * contentWidth
      : 0
  const viewportScreenLeft = viewportContentLeft - contentOffset

  const dragK = useMemo(() => {
    const safeWorkoutScrollWidth = workoutScrollWidth || 1
    const safeMaxViewportWorkoutLeft = maxViewportWorkoutLeft || 1
    const k =
      contentWidth / safeWorkoutScrollWidth -
      overflow / safeMaxViewportWorkoutLeft
    return Math.max(k, 0.001)
  }, [workoutScrollWidth, maxViewportWorkoutLeft, contentWidth, overflow])

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragRef.current?.dragging) return
      const { grabOffset, k, rectLeft } = dragRef.current
      const cursorX = event.clientX - rectLeft
      const desiredViewportLeft = cursorX - grabOffset
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft =
          edgeGutterPx + desiredViewportLeft / k
      }
    },
    [edgeGutterPx, scrollContainerRef]
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
        grabOffset: cursorX - viewportScreenLeft,
        k: dragK,
        rectLeft: rect.left,
      }
    },
    [dragK, viewportScreenLeft]
  )

  const handleBackgroundPointerDown = useCallback(
    (event: React.PointerEvent) => {
      const rect = minimapRef.current?.getBoundingClientRect()
      if (!rect || !scrollContainerRef.current) return

      const cursorX = event.clientX - rect.left
      const desiredViewportLeft = cursorX - viewportWidthPx / 2
      scrollContainerRef.current.scrollLeft =
        edgeGutterPx + desiredViewportLeft / dragK

      event.currentTarget.setPointerCapture(event.pointerId)
      dragRef.current = {
        dragging: true,
        grabOffset: viewportWidthPx / 2,
        k: dragK,
        rectLeft: rect.left,
      }
    },
    [dragK, edgeGutterPx, scrollContainerRef, viewportWidthPx]
  )

  return (
    <div
      ref={minimapRef}
      className="relative h-6 w-full cursor-pointer overflow-hidden"
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 h-full"
        style={{
          width: contentWidth,
          transform: `translateX(${-contentOffset}px)`,
        }}
      >
        <WorkoutMini
          intervals={intervals}
          ftp={ftp}
          powerMode={powerMode}
          className="h-full"
          compact
        />

        {hasSelection && totalDuration > 0 && (
          <svg
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
        className="absolute inset-y-0 cursor-grab rounded-sm border border-foreground/25 bg-foreground/10 active:cursor-grabbing"
        style={{
          left: viewportScreenLeft,
          width: viewportWidthPx,
        }}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  )
}
