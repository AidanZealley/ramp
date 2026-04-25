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
import { clamp, computeMaxPower } from "@/lib/workout-utils"
import { useTimelineScale } from "@/hooks/use-timeline-scale"
import { useTimelineZoom } from "@/hooks/use-timeline-zoom"
import { useIntervalDrag } from "@/hooks/use-interval-drag"
import { useKeypress } from "@/hooks/use-keypress"
import {
  EDITOR_HEIGHT,
  AXIS_HEIGHT,
  MIN_POWER,
  MIN_DURATION,
  DURATION_SNAP,
} from "@/lib/timeline/types"
import { EditorGrid } from "./editor-grid"
import {
  IntervalBlock,
  IntervalBlockOverlay,
  type SelectModifiers,
} from "./interval-block"
import { DragTooltip } from "./drag-tooltip"
import { InsertZone } from "./insert-zone"
import { EditorToolbar } from "./editor-toolbar"
import { Badge } from "../ui/badge"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Button } from "../ui/button"

let _idCounter = 0
const newId = () => String(++_idCounter)

export interface WorkoutEditorHandle {
  /** Insert a new interval. Uses the right-most currently-selected interval as
   *  the insertion point (inserts after it). Falls back to appending at the end
   *  when nothing is selected. */
  insertInterval: () => void
}

interface WorkoutEditorProps {
  intervals: Array<Interval>
  powerMode: "absolute" | "percentage"
  ftp: number
  onIntervalsChange: (intervals: Array<Interval>) => void
}

/**
 * Top-level workout timeline editor.
 *
 * Orchestrates:
 * - Coordinate system (useTimelineScale)
 * - Zoom / fit-to-width (useTimelineZoom)
 * - Custom resize/power drag (useIntervalDrag)
 * - Drag-to-reorder (dnd-kit)
 * - Multi-selection (plain/shift/meta clicks + toolbar toggle)
 * - Copy / paste / delete across the selection
 * - Rendering (DOM-based interval blocks, grid, tooltip)
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
  const [dragPreview, setDragPreview] = useState<Array<Interval> | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Array<string>>([])
  // Stable pivot for shift+click range-selects. Updated by plain/cmd-click,
  // Tab focus, drag-end, paste, and insert — but NOT by shift+click, so the
  // user can grow and shrink a range around the same origin (Finder-style).
  const [anchorId, setAnchorId] = useState<string | null>(null)
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  // Clipboard — per spec, stores stable IDs (not snapshots). Paste resolves
  // IDs against current intervals; missing IDs are silently skipped.
  const [clipboardIds, setClipboardIds] = useState<Array<string>>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeReorderId, setActiveReorderId] = useState<string | null>(null)

  // Stable IDs that travel with each interval through reorders so dnd-kit
  // never sees stale index-based IDs that cause the snap-back flash.
  const [stableIds, setStableIds] = useState<Array<string>>(() =>
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

  // Fast membership check for per-block isSelected computation.
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  // Clipboard-derived data for the preview thumbnail.
  const clipboardData = useMemo(() => {
    if (clipboardIds.length === 0) return null
    const resolved: Array<Interval> = []
    const sourceIndices: Array<number> = []
    for (const id of clipboardIds) {
      const idx = stableIds.indexOf(id)
      if (idx !== -1) {
        resolved.push(displayIntervals[idx])
        sourceIndices.push(idx)
      }
    }
    if (resolved.length === 0) return null
    const gapBefore = sourceIndices.map((srcIdx, i) =>
      i > 0 ? srcIdx !== sourceIndices[i - 1] + 1 : false
    )
    return { intervals: resolved, gapBefore }
  }, [clipboardIds, stableIds, displayIntervals])

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

  // --- Focal-point helper for toolbar zoom buttons ---
  // Returns the content-space X that should stay fixed when the user clicks
  // zoom in/out in the toolbar:
  //   • Selection present → centre of the selected block(s)
  //   • No selection     → centre of the current scroll viewport
  const getToolbarZoomFocalX = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return undefined

    if (selectedIds.length > 0) {
      const indices = selectedIds
        .map((id) => stableIds.indexOf(id))
        .filter((i) => i >= 0)
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

    // No selection — use the centre of the visible viewport.
    return el.scrollLeft + el.clientWidth / 2
  }, [
    selectedIds,
    stableIds,
    scale,
    displayIntervals,
    zoom.pixelsPerSecond,
  ])

  // Wrap zoom in/out so toolbar buttons automatically pass the right focal point.
  const toolbarZoom = useMemo(
    () => ({
      ...zoom,
      zoomIn: () => zoom.zoomIn(getToolbarZoomFocalX()),
      zoomOut: () => zoom.zoomOut(getToolbarZoomFocalX()),
    }),
    [zoom, getToolbarZoomFocalX]
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

      // Replace selection with the dragged interval. (We drop any existing
      // multi-selection here to keep the interaction unambiguous.)
      setSelectedIds([active.id as string])
      setAnchorId(active.id as string)
    },
    [intervals, stableIds, onIntervalsChange]
  )

  // --- Selection ---
  const handleSelect = useCallback(
    (id: string, mods: SelectModifiers) => {
      // Shift+click — replace the selection with the range anchor..id.
      // The anchor is NOT moved, so the user can shift+click multiple times
      // to grow or shrink a range around the same origin.
      if (mods.shift) {
        // Fall back to the last selected id (then the clicked id itself) if
        // the anchor is unset or no longer exists.
        const effAnchor =
          anchorId !== null && stableIds.indexOf(anchorId) !== -1
            ? anchorId
            : (selectedIds[selectedIds.length - 1] ?? id)
        const a = stableIds.indexOf(effAnchor)
        const b = stableIds.indexOf(id)
        if (a !== -1 && b !== -1) {
          const [from, to] = a < b ? [a, b] : [b, a]
          setSelectedIds(stableIds.slice(from, to + 1))
          // Ensure a live anchor is remembered for subsequent shift-clicks.
          if (anchorId === null || stableIds.indexOf(anchorId) === -1) {
            setAnchorId(effAnchor)
          }
          return
        }
      }

      // Cmd/Ctrl+click or multi-select mode — toggle this id in/out. The
      // anchor follows the last discrete click so the next shift+click
      // pivots from here.
      if (mods.meta || multiSelectMode) {
        setSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        )
        setAnchorId(id)
        return
      }

      // Plain click on the lone selected block — deselect (preserves the
      // pre-multi-select toggle behaviour).
      setSelectedIds((prev) => {
        if (prev.length === 1 && prev[0] === id) return []
        return [id]
      })
      setAnchorId(id)
    },
    [stableIds, selectedIds, anchorId, multiSelectMode]
  )

  // Always-select (no toggle) — used when Tab-focusing an interval.
  const handleFocusSelect = useCallback((id: string) => {
    setSelectedIds([id])
    setAnchorId(id)
  }, [])

  // --- Delete ---
  const handleDeleteIntervals = useCallback(
    (ids: Array<string>) => {
      if (ids.length === 0) return
      const toDelete = new Set(ids)
      const keepMask = stableIds.map((id) => !toDelete.has(id))
      setStableIds((prev) => prev.filter((_, i) => keepMask[i]))
      onIntervalsChange(intervals.filter((_, i) => keepMask[i]))
      setSelectedIds([])
      setAnchorId(null)
      setShowDeleteConfirm(false)
    },
    [stableIds, intervals, onIntervalsChange]
  )

  // Branches the current selected set through the confirmation dialog when
  // deleting multiple intervals, but performs the delete immediately for a
  // single selected interval (matches the existing single-delete UX).
  const requestDelete = useCallback(() => {
    if (selectedIds.length === 0) return
    if (selectedIds.length > 1) {
      setShowDeleteConfirm(true)
    } else {
      handleDeleteIntervals(selectedIds)
    }
  }, [selectedIds, handleDeleteIntervals])

  // --- Copy ---
  const handleCopy = useCallback(() => {
    if (selectedIds.length === 0) return
    // Preserve document order in the clipboard so the pasted block order is
    // independent of the order the user clicked them in.
    const ordered = stableIds.filter((id) => selectedIdSet.has(id))
    setClipboardIds(ordered)
  }, [selectedIds, selectedIdSet, stableIds])

  // --- Paste ---
  const handlePaste = useCallback(
    (insertAtIndex?: number) => {
      if (clipboardIds.length === 0) return

      // Resolve clipboard IDs to live intervals; skip ones that have been
      // deleted since they were copied.
      const toPaste: Array<Interval> = []
      for (const id of clipboardIds) {
        const idx = stableIds.indexOf(id)
        if (idx !== -1) toPaste.push(intervals[idx])
      }
      if (toPaste.length === 0) return

      // Determine insertion position:
      //   1. Explicit index from the InsertZone
      //   2. Right of the right-most currently selected interval
      //   3. Append at the end
      let insertAt: number
      if (insertAtIndex !== undefined) {
        insertAt = insertAtIndex
      } else if (selectedIds.length > 0) {
        const rightmost = Math.max(
          ...selectedIds
            .map((id) => stableIds.indexOf(id))
            .filter((i) => i >= 0)
        )
        insertAt = rightmost >= 0 ? rightmost + 1 : intervals.length
      } else {
        insertAt = intervals.length
      }

      const newIds = toPaste.map(() => newId())
      const nextStableIds = [...stableIds]
      nextStableIds.splice(insertAt, 0, ...newIds)
      const nextIntervals = [...intervals]
      nextIntervals.splice(insertAt, 0, ...toPaste)

      setStableIds(nextStableIds)
      onIntervalsChange(nextIntervals)
      // Select the pasted intervals so the user can immediately move / copy
      // them again. Anchor lands on the last pasted id so shift+click will
      // pivot from the end of the paste.
      setSelectedIds(newIds)
      setAnchorId(newIds[newIds.length - 1] ?? null)
      // Scroll effect will centre on the first pasted index. Subsequent
      // pasted blocks are adjacent so they come along for the ride.
      lastInsertIndexRef.current = insertAt
    },
    [clipboardIds, selectedIds, stableIds, intervals, onIntervalsChange]
  )

  // --- Keyboard shortcuts ---
  const powerSnap = powerMode === "absolute" ? 5 : 1

  useKeypress(
    "Backspace",
    useCallback(
      (e: KeyboardEvent) => {
        if (isDragging || selectedIds.length === 0) return
        e.preventDefault()
        requestDelete()
      },
      [isDragging, selectedIds, requestDelete]
    )
  )

  useKeypress(
    "Delete",
    useCallback(
      (e: KeyboardEvent) => {
        if (isDragging || selectedIds.length === 0) return
        e.preventDefault()
        requestDelete()
      },
      [isDragging, selectedIds, requestDelete]
    )
  )

  useKeypress(
    "Escape",
    useCallback(
      (e: KeyboardEvent) => {
        // Prefer closing an open dialog first; otherwise clear selection.
        if (showDeleteConfirm) {
          e.preventDefault()
          setShowDeleteConfirm(false)
          return
        }
        if (selectedIds.length === 0) return
        e.preventDefault()
        setSelectedIds([])
        setAnchorId(null)
      },
      [selectedIds, showDeleteConfirm]
    )
  )

  useKeypress(
    "ArrowUp",
    useCallback(
      (e: KeyboardEvent) => {
        if (isDragging || selectedIds.length === 0) return
        e.preventDefault()
        const maxPower = computeMaxPower(intervals, powerMode)
        const updated = [...intervals]
        for (const id of selectedIds) {
          const idx = stableIds.indexOf(id)
          if (idx === -1) continue
          const iv = updated[idx]
          updated[idx] = {
            ...iv,
            startPower: clamp(iv.startPower + powerSnap, MIN_POWER, maxPower),
            endPower: clamp(iv.endPower + powerSnap, MIN_POWER, maxPower),
          }
        }
        onIntervalsChange(updated)
      },
      [
        isDragging,
        selectedIds,
        stableIds,
        intervals,
        powerMode,
        powerSnap,
        onIntervalsChange,
      ]
    )
  )

  useKeypress(
    "ArrowDown",
    useCallback(
      (e: KeyboardEvent) => {
        if (isDragging || selectedIds.length === 0) return
        e.preventDefault()
        const maxPower = computeMaxPower(intervals, powerMode)
        const updated = [...intervals]
        for (const id of selectedIds) {
          const idx = stableIds.indexOf(id)
          if (idx === -1) continue
          const iv = updated[idx]
          updated[idx] = {
            ...iv,
            startPower: clamp(iv.startPower - powerSnap, MIN_POWER, maxPower),
            endPower: clamp(iv.endPower - powerSnap, MIN_POWER, maxPower),
          }
        }
        onIntervalsChange(updated)
      },
      [
        isDragging,
        selectedIds,
        stableIds,
        intervals,
        powerMode,
        powerSnap,
        onIntervalsChange,
      ]
    )
  )

  useKeypress(
    "ArrowRight",
    useCallback(
      (e: KeyboardEvent) => {
        if (isDragging || selectedIds.length === 0) return
        e.preventDefault()
        const updated = [...intervals]
        for (const id of selectedIds) {
          const idx = stableIds.indexOf(id)
          if (idx === -1) continue
          const iv = updated[idx]
          updated[idx] = {
            ...iv,
            durationSeconds: iv.durationSeconds + DURATION_SNAP,
          }
        }
        onIntervalsChange(updated)
      },
      [isDragging, selectedIds, stableIds, intervals, onIntervalsChange]
    )
  )

  useKeypress(
    "ArrowLeft",
    useCallback(
      (e: KeyboardEvent) => {
        if (isDragging || selectedIds.length === 0) return
        e.preventDefault()
        const updated = [...intervals]
        for (const id of selectedIds) {
          const idx = stableIds.indexOf(id)
          if (idx === -1) continue
          const iv = updated[idx]
          updated[idx] = {
            ...iv,
            durationSeconds: Math.max(
              MIN_DURATION,
              iv.durationSeconds - DURATION_SNAP
            ),
          }
        }
        onIntervalsChange(updated)
      },
      [isDragging, selectedIds, stableIds, intervals, onIntervalsChange]
    )
  )

  // Cmd/Ctrl+C — copy selection (document order)
  useKeypress(
    "c",
    useCallback(
      (e: KeyboardEvent) => {
        if (!(e.metaKey || e.ctrlKey)) return
        if (isDragging || selectedIds.length === 0) return
        e.preventDefault()
        handleCopy()
      },
      [isDragging, selectedIds, handleCopy]
    )
  )

  // Cmd/Ctrl+V — paste clipboard (after right-most selected, else at end)
  useKeypress(
    "v",
    useCallback(
      (e: KeyboardEvent) => {
        if (!(e.metaKey || e.ctrlKey)) return
        if (isDragging || clipboardIds.length === 0) return
        e.preventDefault()
        handlePaste()
      },
      [isDragging, clipboardIds, handlePaste]
    )
  )

  // Cmd/Ctrl+X — cut = copy + delete (delete path reuses the multi guard)
  useKeypress(
    "x",
    useCallback(
      (e: KeyboardEvent) => {
        if (!(e.metaKey || e.ctrlKey)) return
        if (isDragging || selectedIds.length === 0) return
        e.preventDefault()
        // Copy first so the clipboard is populated even if the user cancels
        // the delete-confirmation dialog.
        const ordered = stableIds.filter((id) => selectedIdSet.has(id))
        setClipboardIds(ordered)
        requestDelete()
      },
      [isDragging, selectedIds, selectedIdSet, stableIds, requestDelete]
    )
  )

  // Cmd/Ctrl+A — select every interval
  useKeypress(
    "a",
    useCallback(
      (e: KeyboardEvent) => {
        if (!(e.metaKey || e.ctrlKey)) return
        if (isDragging || stableIds.length === 0) return
        e.preventDefault()
        setSelectedIds([...stableIds])
      },
      [isDragging, stableIds]
    )
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
      setSelectedIds([freshId])
      setAnchorId(freshId)
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
        // Insert after the right-most selected interval, or append.
        let insertAt = intervals.length
        if (selectedIds.length > 0) {
          const rightmost = Math.max(
            ...selectedIds
              .map((id) => stableIds.indexOf(id))
              .filter((i) => i >= 0)
          )
          if (rightmost >= 0) insertAt = rightmost + 1
        }
        handleInsertAt(insertAt)
      },
    }),
    [selectedIds, stableIds, intervals.length, handleInsertAt]
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
      const target = e.target as HTMLElement | null
      // Don't clear when the user clicks inside the editor or the selection
      // toolbar (toolbar sits outside `editorRef`).
      if (editorRef.current && editorRef.current.contains(target)) return
      if (target && target.closest("[data-selection-toolbar]")) return
      if (target && target.closest("[data-editor-action]")) return
      setSelectedIds([])
      setAnchorId(null)
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
      <div className="relative w-10 shrink-0" style={{ height: EDITOR_HEIGHT }}>
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
            onClick={() => {
              setSelectedIds([])
              setAnchorId(null)
            }}
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
                    isSelected={selectedIdSet.has(stableIds[i] ?? "")}
                    isDragTarget={activeDrag?.index === i}
                    isDragging={isDragging}
                    onHover={setHoveredIndex}
                    onSelect={handleSelect}
                    onFocusSelect={handleFocusSelect}
                    onStartDrag={startDrag}
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
                    canPaste={clipboardIds.length > 0}
                    onPaste={handlePaste}
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

        {/* Editor toolbar — selection + clipboard + minimap + zoom */}
        <EditorToolbar
          intervals={displayIntervals}
          ftp={ftp}
          powerMode={powerMode}
          scrollContainerRef={scrollContainerRef}
          zoom={toolbarZoom}
          selectedCount={selectedIds.length}
          multiSelectMode={multiSelectMode}
          canCopy={selectedIds.length > 0}
          onToggleMultiSelect={() => setMultiSelectMode((v) => !v)}
          onCopy={handleCopy}
          onRequestDelete={requestDelete}
          canPaste={clipboardIds.length > 0}
          onPaste={() => handlePaste()}
          selectedIds={selectedIds}
          stableIds={stableIds}
          clipboardData={clipboardData}
        />
      </div>

      {/* Delete-confirmation dialog — shown only for multi-select deletes */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {selectedIds.length} interval
              {selectedIds.length === 1 ? "" : "s"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              {selectedIds.length === 1
                ? "this interval"
                : `these ${selectedIds.length} intervals`}
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => handleDeleteIntervals(selectedIds)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})
