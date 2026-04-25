import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import type { Interval } from "@/lib/workout-utils"
import { WorkoutMini } from "@/components/workout-mini"

/** Fixed content scale — pixels per second of workout duration */
const MINIMAP_PX_PER_SEC = 0.2
/** Minimum content width so very short workouts aren't tiny slivers */
const MINIMAP_MIN_WIDTH = 120

interface EditorMinimapProps {
  intervals: Interval[]
  ftp: number
  powerMode: "absolute" | "percentage"
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  /** Current zoom scale — passed so the minimap re-syncs when zoom changes scrollWidth */
  pixelsPerSecond: number
  /** Stable IDs of currently selected intervals */
  selectedIds: string[]
  /** Stable ID array (parallel to intervals) */
  stableIds: string[]
}

export function EditorMinimap({
  intervals,
  ftp,
  powerMode,
  scrollContainerRef,
  pixelsPerSecond,
  selectedIds,
  stableIds,
}: EditorMinimapProps) {
  const minimapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    dragging: boolean
    /** Cursor X within the viewport indicator at drag start (container space) */
    grabOffset: number
    /** viewportScreenLeft = scrollLeft * k — constant while dimensions don't change */
    k: number
    /** Minimap container's left edge at drag start */
    rectLeft: number
  } | null>(null)

  const [containerWidth, setContainerWidth] = useState(0)

  const [scrollState, setScrollState] = useState({
    scrollLeft: 0,
    clientWidth: 0,
    scrollWidth: 0,
  })

  // Track minimap container width
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

  // Track scroll position and container size
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

  // Re-sync when zoom changes: scrollWidth updates but no scroll event fires.
  // rAF ensures we read after the browser has applied the new content layout.
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

  // Fast membership check for selection overlay
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const hasSelection = selectedIds.length > 0

  // ── Fixed-scale content width ──────────────────────────────────
  const totalDuration = useMemo(
    () => intervals.reduce((sum, i) => sum + i.durationSeconds, 0),
    [intervals]
  )

  const contentWidth = Math.max(
    totalDuration * MINIMAP_PX_PER_SEC,
    MINIMAP_MIN_WIDTH
  )

  // ── Content scrolling (VS Code-style) ─────────────────────────
  const overflow = Math.max(0, contentWidth - containerWidth)
  const maxScroll = scrollWidth - clientWidth
  const scrollRatio = maxScroll > 0 ? scrollLeft / maxScroll : 0
  const contentOffset = scrollRatio * overflow

  // ── Viewport indicator (pixel-based) ──────────────────────────
  const viewportWidthPx =
    scrollWidth > 0 ? (clientWidth / scrollWidth) * contentWidth : contentWidth
  const viewportContentLeft =
    scrollWidth > 0 ? (scrollLeft / scrollWidth) * contentWidth : 0
  const viewportScreenLeft = viewportContentLeft - contentOffset

  // viewportScreenLeft = scrollLeft * k  →  scrollLeft = viewportScreenLeft / k
  // k is constant for a given set of container/content dimensions.
  const dragK = useMemo(() => {
    const safeScrollWidth = scrollWidth || 1
    const maxScroll = scrollWidth - clientWidth
    const safeMaxScroll = maxScroll || 1
    const k = contentWidth / safeScrollWidth - overflow / safeMaxScroll
    return Math.max(k, 0.001)
  }, [scrollWidth, clientWidth, contentWidth, overflow])

  // Shared move/up handlers — used by both viewport and background drags
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current?.dragging) return
      const { grabOffset, k, rectLeft } = dragRef.current
      const cursorX = e.clientX - rectLeft
      const desiredViewportLeft = cursorX - grabOffset
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = desiredViewportLeft / k
      }
    },
    [scrollContainerRef]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
  }, [])

  // ── Drag the viewport rectangle to scroll ─────────────────────
  const handleViewportPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      const rect = minimapRef.current?.getBoundingClientRect()
      if (!rect) return
      e.currentTarget.setPointerCapture(e.pointerId)
      // grabOffset = how far into the indicator the user clicked
      const cursorX = e.clientX - rect.left
      dragRef.current = {
        dragging: true,
        grabOffset: cursorX - viewportScreenLeft,
        k: dragK,
        rectLeft: rect.left,
      }
    },
    [viewportScreenLeft, dragK]
  )

  // ── Click background to jump viewport ─────────────────────────
  const handleBackgroundPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const rect = minimapRef.current?.getBoundingClientRect()
      if (!rect || !scrollContainerRef.current) return

      // Jump so the viewport center lands under the cursor, then drag from center
      const cursorX = e.clientX - rect.left
      const desiredViewportLeft = cursorX - viewportWidthPx / 2
      scrollContainerRef.current.scrollLeft = desiredViewportLeft / dragK

      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = {
        dragging: true,
        grabOffset: viewportWidthPx / 2,
        k: dragK,
        rectLeft: rect.left,
      }
    },
    [scrollContainerRef, viewportWidthPx, dragK]
  )

  const handleBackgroundPointerMove = handlePointerMove
  const handleBackgroundPointerUp = handlePointerUp

  return (
    <div
      ref={minimapRef}
      className="relative h-6 w-full cursor-pointer overflow-hidden"
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handleBackgroundPointerMove}
      onPointerUp={handleBackgroundPointerUp}
    >
      {/* Content layer — fixed width, translates for long workouts */}
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

        {/* Selection dimming overlay — dims unselected intervals so selected ones pop */}
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
              return intervals.map((interval, i) => {
                const w =
                  (interval.durationSeconds / totalDuration) * viewBoxWidth
                const ix = x
                x += w
                // Only dim unselected intervals
                if (selectedIdSet.has(stableIds[i] ?? "")) return null
                return (
                  <rect
                    key={i}
                    x={ix}
                    y={0}
                    width={w}
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

      {/* Viewport indicator — positioned in container space */}
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
