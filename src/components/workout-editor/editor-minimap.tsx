import { useState, useEffect, useRef, useCallback } from "react"
import type { Interval } from "@/lib/workout-utils"
import { WorkoutMini } from "@/components/workout-mini"

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

  const [scrollState, setScrollState] = useState({
    scrollLeft: 0,
    clientWidth: 0,
    scrollWidth: 0,
  })

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
  const scrollFraction = scrollWidth > 0 ? scrollLeft / scrollWidth : 0
  const viewportFraction = scrollWidth > 0 ? clientWidth / scrollWidth : 1

  // Convert a minimap pixel position to a scroll position
  const minimapXToScrollLeft = useCallback(
    (minimapX: number) => {
      const minimapWidth = minimapRef.current?.clientWidth ?? 1
      return (minimapX / minimapWidth) * scrollWidth
    },
    [scrollWidth]
  )

  // Drag the viewport rectangle to scroll
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

      const minimapWidth = minimapRef.current?.clientWidth ?? 1
      const deltaX = e.clientX - dragRef.current.startX
      const scrollDelta = deltaX * (scrollWidth / minimapWidth)

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft =
          dragRef.current.startScrollLeft + scrollDelta
      }
    },
    [scrollContainerRef, scrollWidth]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
  }, [])

  // Click background to jump viewport to that position
  const handleBackgroundPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const rect = minimapRef.current?.getBoundingClientRect()
      if (!rect || !scrollContainerRef.current) return

      const clickX = e.clientX - rect.left
      const targetScrollLeft =
        minimapXToScrollLeft(clickX) - clientWidth / 2

      scrollContainerRef.current.scrollLeft = targetScrollLeft

      // Begin dragging from this new position
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = {
        dragging: true,
        startX: e.clientX,
        startScrollLeft: scrollContainerRef.current.scrollLeft,
      }
    },
    [scrollContainerRef, minimapXToScrollLeft, clientWidth]
  )

  const handleBackgroundPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current?.dragging) return

      const minimapWidth = minimapRef.current?.clientWidth ?? 1
      const deltaX = e.clientX - dragRef.current.startX
      const scrollDelta = deltaX * (scrollWidth / minimapWidth)

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft =
          dragRef.current.startScrollLeft + scrollDelta
      }
    },
    [scrollContainerRef, scrollWidth]
  )

  const handleBackgroundPointerUp = useCallback((e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
  }, [])

  return (
    <div
      ref={minimapRef}
      className="relative h-6 min-w-0 flex-1 cursor-pointer overflow-hidden rounded border border-border/30 bg-muted/10"
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handleBackgroundPointerMove}
      onPointerUp={handleBackgroundPointerUp}
    >
      {/* Workout shape (non-interactive layer) */}
      <div className="pointer-events-none h-full">
        <WorkoutMini
          intervals={intervals}
          ftp={ftp}
          powerMode={powerMode}
          className="h-full"
          compact
        />
      </div>

      {/* Viewport indicator rectangle (draggable) */}
      <div
        className="absolute inset-y-0 cursor-grab rounded-sm border border-foreground/25 bg-foreground/10 active:cursor-grabbing"
        style={{
          left: `${scrollFraction * 100}%`,
          width: `${viewportFraction * 100}%`,
        }}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  )
}
