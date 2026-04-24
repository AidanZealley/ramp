import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import type { Interval } from "@/lib/workout-utils"
import { WorkoutMini } from "@/components/workout-mini"

/** Fixed content scale — pixels per second of workout duration */
const MINIMAP_PX_PER_SEC = 0.4
/** Minimum content width so very short workouts aren't tiny slivers */
const MINIMAP_MIN_WIDTH = 120

interface EditorMinimapProps {
  intervals: Interval[]
  ftp: number
  powerMode: "absolute" | "percentage"
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
}

export function EditorMinimap({
  intervals,
  ftp,
  powerMode,
  scrollContainerRef,
}: EditorMinimapProps) {
  const minimapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    dragging: boolean
    startX: number
    startScrollLeft: number
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

  const { scrollLeft, clientWidth, scrollWidth } = scrollState

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

  // Convert a container-space X position to an editor scroll position
  const containerXToScrollLeft = useCallback(
    (containerX: number) => {
      const contentX = containerX + contentOffset
      return (contentX / contentWidth) * scrollWidth
    },
    [scrollWidth, contentWidth, contentOffset]
  )

  // ── Drag the viewport rectangle to scroll ─────────────────────
  const handleViewportPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = {
        dragging: true,
        startX: e.clientX,
        startScrollLeft: scrollContainerRef.current?.scrollLeft ?? 0,
      }
    },
    [scrollContainerRef]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current?.dragging) return

      const safeContainerWidth = containerWidth || 1
      const deltaX = e.clientX - dragRef.current.startX
      const scrollDelta = deltaX * (scrollWidth / safeContainerWidth)

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft =
          dragRef.current.startScrollLeft + scrollDelta
      }
    },
    [scrollContainerRef, scrollWidth, containerWidth]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
  }, [])

  // ── Click background to jump viewport ─────────────────────────
  const handleBackgroundPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const rect = minimapRef.current?.getBoundingClientRect()
      if (!rect || !scrollContainerRef.current) return

      const clickX = e.clientX - rect.left
      const targetScrollLeft = containerXToScrollLeft(clickX) - clientWidth / 2

      scrollContainerRef.current.scrollLeft = targetScrollLeft

      // Begin dragging from this new position
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = {
        dragging: true,
        startX: e.clientX,
        startScrollLeft: scrollContainerRef.current.scrollLeft,
      }
    },
    [scrollContainerRef, containerXToScrollLeft, clientWidth]
  )

  const handleBackgroundPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current?.dragging) return

      const safeContainerWidth = containerWidth || 1
      const deltaX = e.clientX - dragRef.current.startX
      const scrollDelta = deltaX * (scrollWidth / safeContainerWidth)

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft =
          dragRef.current.startScrollLeft + scrollDelta
      }
    },
    [scrollContainerRef, scrollWidth, containerWidth]
  )

  const handleBackgroundPointerUp = useCallback((e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
  }, [])

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
