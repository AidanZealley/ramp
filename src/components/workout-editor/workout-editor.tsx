import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import type { Interval } from "@/lib/workout-utils"
import { useTimelineScale } from "@/hooks/use-timeline-scale"
import { useTimelineZoom } from "@/hooks/use-timeline-zoom"
import { useIntervalDrag } from "@/hooks/use-interval-drag"
import { EDITOR_HEIGHT, AXIS_HEIGHT } from "@/lib/timeline/types"
import { EditorGrid } from "./editor-grid"
import { IntervalBlock, IntervalBlockOverlay } from "./interval-block"
import { DragTooltip } from "./drag-tooltip"
import { InsertZone } from "./insert-zone"
import { EditorToolbar } from "./editor-toolbar"
import { Badge } from "../ui/badge"

let _idCounter = 0
const newId = () => String(++_idCounter)

export interface WorkoutEditorHandle {
  /** Insert a new interval. Uses the currently-selected interval as the
   *  insertion point (inserts after it). Falls back to appending at the end
   *  when nothing is selected. */
  insertInterval(): void
}

interface WorkoutEditorProps {
  intervals: Interval[]
  powerMode: "absolute" | "percentage"
  ftp: number
  onIntervalsChange: (intervals: Interval[]) => void
}

/**
 * Top-level workout timeline editor.
 *
 * Orchestrates:
 * - Coordinate system (useTimelineScale)
 * - Zoom / fit-to-width (useTimelineZoom)
 * - Custom resize/power drag (useIntervalDrag)
 * - Drag-to-reorder (dnd-kit)
 * - Rendering (DOM-based interval blocks, grid, tooltip)
 *
 * Props interface is identical to the previous SVG-based editor,
 * so the parent component requires zero changes.
 */
export const WorkoutEditor = forwardRef<
  WorkoutEditorHandle,
  WorkoutEditorProps
>(function WorkoutEditor(
  { intervals, powerMode, ftp, onIntervalsChange },
  ref
) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const prevIntervalCountRef = useRef(intervals.length)
  // Tracks where the last interval was inserted so the scroll effect can
  // bring it into view rather than always jumping to the end.
  const lastInsertIndexRef = useRef<number | null>(null)

  // --- State ---
  const [dragPreview, setDragPreview] = useState<Interval[] | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeReorderId, setActiveReorderId] = useState<string | null>(null)

  // Stable IDs that travel with each interval through reorders so dnd-kit
  // never sees stale index-based IDs that cause the snap-back flash.
  const [stableIds, setStableIds] = useState<string[]>(() =>
    intervals.map(() => newId())
  )

  // Keep stableIds length in sync when intervals are added/removed externally.
  useEffect(() => {
    setStableIds((prev) => {
      if (prev.length === intervals.length) return prev
      if (intervals.length > prev.length) {
        const extra = Array.from(
          { length: intervals.length - prev.length },
          () => newId()
        )
        return [...prev, ...extra]
      }
      return prev.slice(0, intervals.length)
    })
  }, [intervals.length])

  // The intervals to display: drag preview during resize, original otherwise
  const displayIntervals = dragPreview ?? intervals

  // --- Total duration (needed by zoom hook before scale is created) ---
  const totalDurationSec = useMemo(
    () => displayIntervals.reduce((s, iv) => s + iv.durationSeconds, 0),
    [displayIntervals]
  )

  // --- Zoom / fit-to-width ---
  const zoom = useTimelineZoom({
    totalDurationSec,
    containerRef: scrollContainerRef,
  })

  // --- Coordinate system ---
  const scale = useTimelineScale(
    displayIntervals,
    powerMode,
    zoom.pixelsPerSecond
  )

  // --- Custom resize/power drag ---
  const { activeDrag, startDrag } = useIntervalDrag({
    intervals,
    powerMode,
    pixelsPerSecond: zoom.pixelsPerSecond,
    onPreviewChange: setDragPreview,
    onCommit: onIntervalsChange,
  })

  // --- dnd-kit sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // px — prevents accidental reorder on click
      },
    })
  )

  // Combined drag state: either custom drag or dnd-kit reorder
  const isDragging = activeDrag !== null || activeReorderId !== null

  // --- dnd-kit handlers ---
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveReorderId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveReorderId(null)

      if (!over || active.id === over.id) return

      // Resolve positions from stable IDs (not raw indices).
      const oldIndex = stableIds.indexOf(active.id as string)
      const newIndex = stableIds.indexOf(over.id as string)

      if (
        oldIndex === -1 ||
        newIndex === -1 ||
        oldIndex >= intervals.length ||
        newIndex >= intervals.length
      ) {
        return
      }

      // Update IDs and intervals atomically so dnd-kit never sees stale order.
      setStableIds((prev) => arrayMove([...prev], oldIndex, newIndex))
      onIntervalsChange(arrayMove([...intervals], oldIndex, newIndex))

      // Select the interval that was just dragged (replaces any existing selection).
      setSelectedId(active.id as string)
    },
    [intervals, stableIds, onIntervalsChange]
  )

  // --- Selection ---
  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }, [])

  // --- Delete ---
  const handleDeleteInterval = useCallback(
    (index: number) => {
      setStableIds((prev) => prev.filter((_, i) => i !== index))
      onIntervalsChange(intervals.filter((_, i) => i !== index))
      setSelectedId(null)
    },
    [intervals, onIntervalsChange]
  )

  // --- Insert ---
  // `index` is the position to insert at (0 = before first, intervals.length = append).
  const handleInsertAt = useCallback(
    (index: number) => {
      const prev = displayIntervals[index - 1]
      const next = displayIntervals[index]
      const defaultPower = powerMode === "absolute" ? 150 : 75

      const newInterval: Interval = {
        startPower: prev ? prev.endPower : (next?.startPower ?? defaultPower),
        endPower: next ? next.startPower : (prev?.endPower ?? defaultPower),
        durationSeconds: 300,
      }

      const freshId = newId()
      const newIntervals = [...intervals]
      newIntervals.splice(index, 0, newInterval)

      setStableIds((ids) => {
        const updated = [...ids]
        updated.splice(index, 0, freshId)
        return updated
      })

      // Auto-select the new interval and remember where it landed for scroll.
      setSelectedId(freshId)
      lastInsertIndexRef.current = index

      onIntervalsChange(newIntervals)
    },
    [intervals, displayIntervals, powerMode, onIntervalsChange]
  )

  // --- Expose imperative API ---
  useImperativeHandle(
    ref,
    () => ({
      insertInterval() {
        const selectedIndex =
          selectedId !== null ? stableIds.indexOf(selectedId) : -1
        // Insert after the selected interval, or append if nothing is selected.
        const insertAt =
          selectedIndex >= 0 ? selectedIndex + 1 : intervals.length
        handleInsertAt(insertAt)
      },
    }),
    [selectedId, stableIds, intervals.length, handleInsertAt]
  )

  // --- Scroll to the newly inserted interval ---
  useEffect(() => {
    if (intervals.length > prevIntervalCountRef.current) {
      const container = scrollContainerRef.current
      if (container) {
        const insertIdx = lastInsertIndexRef.current
        if (insertIdx !== null && insertIdx < intervals.length) {
          // Scroll so the new interval is visible (roughly centred).
          const x = scale.getIntervalX(insertIdx)
          const ivWidth =
            intervals[insertIdx].durationSeconds * zoom.pixelsPerSecond
          const target = x + ivWidth / 2 - container.clientWidth / 2
          container.scrollTo({ left: Math.max(0, target), behavior: "smooth" })
        } else {
          // Fallback: scroll to end (appended without tracking index).
          container.scrollTo({
            left: container.scrollWidth,
            behavior: "smooth",
          })
        }
      }
      lastInsertIndexRef.current = null
    }
    prevIntervalCountRef.current = intervals.length
  }, [intervals.length, intervals, scale, zoom.pixelsPerSecond])

  // --- Deselect on click outside the editor ---
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setSelectedId(null)
      }
    }
    document.addEventListener("click", handleDocumentClick)
    return () => document.removeEventListener("click", handleDocumentClick)
  }, [])

  // The interval currently being reordered (for DragOverlay)
  const activeReorderIndex =
    activeReorderId !== null ? stableIds.indexOf(activeReorderId) : null
  const activeReorderInterval =
    activeReorderIndex !== null && activeReorderIndex !== -1
      ? displayIntervals[activeReorderIndex]
      : null

  return (
    <div className="flex select-none">
      {/* Y-axis labels */}
      <div className="relative w-12 shrink-0" style={{ height: EDITOR_HEIGHT }}>
        {scale.powerTicks.map((power) => (
          <span
            key={power}
            className="absolute right-1 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums"
            style={{ top: scale.powerToY(power) }}
          >
            {powerMode === "absolute" ? `${power}` : `${power}%`}
          </span>
        ))}
      </div>

      {/* Main editor area */}
      <div className="relative min-w-0 flex-1">
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto rounded-lg border border-border/50 bg-muted/20"
        >
          <div
            ref={editorRef}
            className="relative"
            style={{
              width: scale.totalWidth + 20,
              height: EDITOR_HEIGHT + AXIS_HEIGHT,
              cursor: activeReorderId ? "grabbing" : undefined,
            }}
            onClick={() => setSelectedId(null)}
          >
            {/* Background grid */}
            <EditorGrid scale={scale} ftp={ftp} powerMode={powerMode} />

            {/* Interval blocks with dnd-kit */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={stableIds}
                strategy={horizontalListSortingStrategy}
              >
                {displayIntervals.map((interval, i) => (
                  <IntervalBlock
                    key={stableIds[i] ?? i}
                    stableId={stableIds[i] ?? String(i)}
                    interval={interval}
                    index={i}
                    scale={scale}
                    ftp={ftp}
                    powerMode={powerMode}
                    isHovered={hoveredIndex === i && !isDragging}
                    isSelected={stableIds[i] === selectedId}
                    isDragTarget={activeDrag?.index === i}
                    isDragging={isDragging}
                    onHover={setHoveredIndex}
                    onSelect={handleSelect}
                    onStartDrag={startDrag}
                    onDelete={handleDeleteInterval}
                  />
                ))}
              </SortableContext>

              {/* Ghost overlay during reorder drag */}
              <DragOverlay dropAnimation={null}>
                {activeReorderInterval ? (
                  <IntervalBlockOverlay
                    interval={activeReorderInterval}
                    scale={scale}
                    ftp={ftp}
                    powerMode={powerMode}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* Insert zones between blocks */}
            {!isDragging &&
              displayIntervals.length >= 2 &&
              displayIntervals
                .slice(1)
                .map((_, i) => (
                  <InsertZone
                    key={`insert-${i + 1}`}
                    x={scale.getIntervalX(i + 1)}
                    index={i + 1}
                    height={EDITOR_HEIGHT}
                    onInsert={handleInsertAt}
                  />
                ))}

            {/* Live drag value tooltip (resize/power drags only) */}
            {activeDrag && dragPreview && (
              <DragTooltip
                activeDrag={activeDrag}
                intervals={dragPreview}
                scale={scale}
                powerMode={powerMode}
                containerWidth={scale.totalWidth + 20}
              />
            )}
          </div>
        </div>

        {/* FTP label – pinned to right edge of visible area */}
        {(() => {
          const ftpPower = powerMode === "absolute" ? ftp : 100
          const ftpY = scale.powerToY(ftpPower)
          const showFtpLine = ftpPower <= scale.maxPower && ftpPower > 0
          return showFtpLine ? (
            <Badge
              variant="outline"
              className="absolute right-2"
              style={{ top: ftpY - 24 }}
            >
              FTP
            </Badge>
          ) : null
        })()}

        {/* Editor toolbar — minimap + zoom controls */}
        <EditorToolbar
          intervals={displayIntervals}
          ftp={ftp}
          powerMode={powerMode}
          scrollContainerRef={scrollContainerRef}
          zoom={zoom}
        />
      </div>
    </div>
  )
})
