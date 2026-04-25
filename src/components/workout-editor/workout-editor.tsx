import {
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
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable"
import type { Interval } from "@/lib/workout-utils"
import { computeMaxPower } from "@/lib/workout-utils"
import { useTimelineScale } from "@/hooks/use-timeline-scale"
import { useTimelineZoom } from "@/hooks/use-timeline-zoom"
import { useIntervalDrag } from "@/hooks/use-interval-drag"
import { useKeypress } from "@/hooks/use-keypress"
import {
  EDITOR_HEIGHT,
  AXIS_HEIGHT,
  DURATION_SNAP,
  TIMELINE_EDGE_GUTTER,
} from "@/lib/timeline/types"
import { EditorGrid } from "./editor-grid"
import { IntervalBlock, IntervalBlockOverlay } from "./interval-block"
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
import {
  WorkoutEditorStoreProvider,
  useWorkoutEditorActions,
  useWorkoutEditorActiveReorderId,
  useWorkoutEditorDisplayIntervals,
  useWorkoutEditorDragPreview,
  useWorkoutEditorFtp,
  useWorkoutEditorHasClipboard,
  useWorkoutEditorIntervals,
  useWorkoutEditorOnIntervalsChange,
  useWorkoutEditorPowerMode,
  useWorkoutEditorSelectedCount,
  useWorkoutEditorSelectedIds,
  useWorkoutEditorShowDeleteConfirm,
  useWorkoutEditorStableIds,
} from "./workout-editor-store"

export interface WorkoutEditorHandle {
  insertInterval: () => void
}

interface WorkoutEditorProps {
  intervals: Array<Interval>
  powerMode: "absolute" | "percentage"
  ftp: number
  onIntervalsChange: (intervals: Array<Interval>) => void
}

export const WorkoutEditor = forwardRef<
  WorkoutEditorHandle,
  WorkoutEditorProps
>(function WorkoutEditor(props, ref) {
  return (
    <WorkoutEditorStoreProvider {...props}>
      <WorkoutEditorInner ref={ref} />
    </WorkoutEditorStoreProvider>
  )
})

const WorkoutEditorInner = forwardRef<WorkoutEditorHandle>(
  function WorkoutEditorInner(_, ref) {
    const intervals = useWorkoutEditorIntervals()
    const displayIntervals = useWorkoutEditorDisplayIntervals()
    const powerMode = useWorkoutEditorPowerMode()
    const ftp = useWorkoutEditorFtp()
    const onIntervalsChange = useWorkoutEditorOnIntervalsChange()
    const dragPreview = useWorkoutEditorDragPreview()
    const selectedIds = useWorkoutEditorSelectedIds()
    const selectedCount = useWorkoutEditorSelectedCount()
    const stableIds = useWorkoutEditorStableIds()
    const hasClipboard = useWorkoutEditorHasClipboard()
    const showDeleteConfirm = useWorkoutEditorShowDeleteConfirm()
    const activeReorderId = useWorkoutEditorActiveReorderId()
    const actions = useWorkoutEditorActions()

    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<HTMLDivElement>(null)
    const prevIntervalCountRef = useRef(intervals.length)

    const totalDurationSec = useMemo(
      () => displayIntervals.reduce((sum, interval) => sum + interval.durationSeconds, 0),
      [displayIntervals]
    )

    const zoom = useTimelineZoom({
      totalDurationSec,
      containerRef: scrollContainerRef,
      edgeGutterPx: TIMELINE_EDGE_GUTTER,
    })

    const scale = useTimelineScale(
      displayIntervals,
      powerMode,
      zoom.pixelsPerSecond
    )

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
    }, [selectedIds, stableIds, scale, displayIntervals, zoom.pixelsPerSecond])

    const toolbarZoom = useMemo(
      () => ({
        ...zoom,
        zoomIn: () => zoom.zoomIn(getToolbarZoomFocalX()),
        zoomOut: () => zoom.zoomOut(getToolbarZoomFocalX()),
      }),
      [zoom, getToolbarZoomFocalX]
    )

    const { activeDrag, startDrag } = useIntervalDrag({
      intervals,
      powerMode,
      pixelsPerSecond: zoom.pixelsPerSecond,
      onPreviewChange: actions.setDragPreview,
      onCommit: onIntervalsChange,
    })

    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 5,
        },
      })
    )

    const isDragging = activeDrag !== null || activeReorderId !== null

    const handleDragStart = useCallback(
      (event: DragStartEvent) => {
        actions.setActiveReorderId(event.active.id as string)
      },
      [actions]
    )

    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) {
          actions.setActiveReorderId(null)
          return
        }

        const oldIndex = stableIds.indexOf(active.id as string)
        const newIndex = stableIds.indexOf(over.id as string)
        actions.reorderIntervals(oldIndex, newIndex, active.id as string)
      },
      [actions, stableIds]
    )

    const powerSnap = powerMode === "absolute" ? 5 : 1

    useKeypress(
      "Backspace",
      useCallback(
        (event: KeyboardEvent) => {
          if (isDragging || selectedCount === 0) return
          event.preventDefault()
          actions.requestDelete()
        },
        [actions, isDragging, selectedCount]
      )
    )

    useKeypress(
      "Delete",
      useCallback(
        (event: KeyboardEvent) => {
          if (isDragging || selectedCount === 0) return
          event.preventDefault()
          actions.requestDelete()
        },
        [actions, isDragging, selectedCount]
      )
    )

    useKeypress(
      "Escape",
      useCallback(
        (event: KeyboardEvent) => {
          if (showDeleteConfirm) {
            event.preventDefault()
            actions.cancelDelete()
            return
          }
          if (selectedCount === 0) return
          event.preventDefault()
          actions.clearSelection()
        },
        [actions, selectedCount, showDeleteConfirm]
      )
    )

    useKeypress(
      "ArrowUp",
      useCallback(
        (event: KeyboardEvent) => {
          if (isDragging || selectedCount === 0) return
          event.preventDefault()
          actions.nudgeSelectedPower(powerSnap)
        },
        [actions, isDragging, powerSnap, selectedCount]
      )
    )

    useKeypress(
      "ArrowDown",
      useCallback(
        (event: KeyboardEvent) => {
          if (isDragging || selectedCount === 0) return
          event.preventDefault()
          actions.nudgeSelectedPower(-powerSnap)
        },
        [actions, isDragging, powerSnap, selectedCount]
      )
    )

    useKeypress(
      "ArrowRight",
      useCallback(
        (event: KeyboardEvent) => {
          if (isDragging || selectedCount === 0) return
          event.preventDefault()
          actions.nudgeSelectedDuration(DURATION_SNAP)
        },
        [actions, isDragging, selectedCount]
      )
    )

    useKeypress(
      "ArrowLeft",
      useCallback(
        (event: KeyboardEvent) => {
          if (isDragging || selectedCount === 0) return
          event.preventDefault()
          actions.nudgeSelectedDuration(-DURATION_SNAP)
        },
        [actions, isDragging, selectedCount]
      )
    )

    useKeypress(
      "c",
      useCallback(
        (event: KeyboardEvent) => {
          if (!(event.metaKey || event.ctrlKey)) return
          if (isDragging || selectedCount === 0) return
          event.preventDefault()
          actions.copySelection()
        },
        [actions, isDragging, selectedCount]
      )
    )

    useKeypress(
      "v",
      useCallback(
        (event: KeyboardEvent) => {
          if (!(event.metaKey || event.ctrlKey)) return
          if (isDragging || !hasClipboard) return
          event.preventDefault()
          actions.pasteClipboard()
        },
        [actions, hasClipboard, isDragging]
      )
    )

    useKeypress(
      "x",
      useCallback(
        (event: KeyboardEvent) => {
          if (!(event.metaKey || event.ctrlKey)) return
          if (isDragging || selectedCount === 0) return
          event.preventDefault()
          actions.cutSelection()
        },
        [actions, isDragging, selectedCount]
      )
    )

    useKeypress(
      "a",
      useCallback(
        (event: KeyboardEvent) => {
          if (!(event.metaKey || event.ctrlKey)) return
          if (isDragging || stableIds.length === 0) return
          event.preventDefault()
          actions.selectAll()
        },
        [actions, isDragging, stableIds.length]
      )
    )

    useImperativeHandle(
      ref,
      () => ({
        insertInterval() {
          let insertAt = intervals.length
          if (selectedIds.length > 0) {
            const rightmost = Math.max(
              ...selectedIds
                .map((id) => stableIds.indexOf(id))
                .filter((index) => index >= 0)
            )
            if (rightmost >= 0) {
              insertAt = rightmost + 1
            }
          }
          actions.insertAt(insertAt)
        },
      }),
      [actions, intervals.length, selectedIds, stableIds]
    )

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
              intervals[insertIndex]?.durationSeconds * zoom.pixelsPerSecond
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
    }, [intervals, scale, selectedIds, stableIds, zoom.pixelsPerSecond])

    useEffect(() => {
      const handleDocumentClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null
        if (editorRef.current && editorRef.current.contains(target)) return
        if (target && target.closest("[data-selection-toolbar]")) return
        if (target && target.closest("[data-editor-action]")) return
        actions.clearSelection()
      }

      document.addEventListener("click", handleDocumentClick)
      return () => document.removeEventListener("click", handleDocumentClick)
    }, [actions])

    const activeReorderIndex =
      activeReorderId !== null ? stableIds.indexOf(activeReorderId) : null
    const activeReorderInterval =
      activeReorderIndex !== null && activeReorderIndex !== -1
        ? displayIntervals[activeReorderIndex]
        : null

    const maxPower = computeMaxPower(displayIntervals, powerMode)

    return (
      <div className="flex select-none">
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

        <div className="relative min-w-0 flex-1">
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto rounded-lg border border-border/50 bg-muted/20"
          >
            <div
              ref={editorRef}
              className="relative"
              style={{
                width: scale.contentWidth,
                height: EDITOR_HEIGHT + AXIS_HEIGHT,
                cursor: activeReorderId ? "grabbing" : undefined,
              }}
              onClick={() => actions.clearSelection()}
            >
              <EditorGrid scale={scale} ftp={ftp} powerMode={powerMode} />

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
                  {displayIntervals.map((_, index) => (
                    <IntervalBlock
                      key={stableIds[index] ?? index}
                      stableId={stableIds[index] ?? String(index)}
                      index={index}
                      scale={scale}
                      isDragTarget={activeDrag?.index === index}
                      isDragging={isDragging}
                      onStartDrag={startDrag}
                    />
                  ))}
                </SortableContext>

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

              {!isDragging &&
                displayIntervals.length >= 2 &&
                displayIntervals.slice(1).map((_, index) => (
                  <InsertZone
                    key={`insert-${index + 1}`}
                    x={scale.getIntervalX(index + 1)}
                    index={index + 1}
                    height={EDITOR_HEIGHT}
                  />
                ))}

              {activeDrag && dragPreview && (
                <DragTooltip
                  activeDrag={activeDrag}
                  intervals={dragPreview}
                  scale={scale}
                  powerMode={powerMode}
                  containerWidth={scale.contentWidth}
                />
              )}
            </div>
          </div>

          {(() => {
            const ftpPower = powerMode === "absolute" ? ftp : 100
            const ftpY = scale.powerToY(ftpPower)
            const showFtpLine = ftpPower <= maxPower && ftpPower > 0
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

          <EditorToolbar
            scrollContainerRef={scrollContainerRef}
            edgeGutterPx={TIMELINE_EDGE_GUTTER}
            zoom={toolbarZoom}
          />
        </div>

        <Dialog open={showDeleteConfirm} onOpenChange={actions.cancelDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Delete {selectedCount} interval
                {selectedCount === 1 ? "" : "s"}
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                {selectedCount === 1
                  ? "this interval"
                  : `these ${selectedCount} intervals`}
                ? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button variant="destructive" onClick={actions.confirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
)
