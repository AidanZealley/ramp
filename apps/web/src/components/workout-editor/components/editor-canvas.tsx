import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core"
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useWorkoutEditorActions,
  useWorkoutEditorActiveReorderId,
  useWorkoutEditorDisplayIntervals,
  useWorkoutEditorDisplayMode,
  useWorkoutEditorDragPreview,
  useWorkoutEditorFtp,
  useWorkoutEditorSelectedIds,
  useWorkoutEditorStableIds,
} from "../store"
import { useReorderDnd } from "../hooks/use-reorder-dnd"
import { EditorGrid } from "./editor-grid"
import { IntervalBlock, IntervalBlockOverlay } from "./interval-block"
import { InsertZone } from "./insert-zone"
import { DragTooltip } from "./drag-tooltip"
import type { TimelineScale } from "@/hooks/use-timeline-scale"
import type { DragType } from "@/lib/timeline/types"
import { AXIS_HEIGHT, EDITOR_HEIGHT } from "@/lib/timeline/types"

interface EditorCanvasProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  editorRef: React.RefObject<HTMLDivElement | null>
  scale: TimelineScale
  activeDrag: { type: DragType; index: number } | null
  startDrag: (event: React.PointerEvent, type: DragType, index: number) => void
}

export function EditorCanvas({
  scrollContainerRef,
  editorRef,
  scale,
  activeDrag,
  startDrag,
}: EditorCanvasProps) {
  const stableIds = useWorkoutEditorStableIds()
  const selectedIds = useWorkoutEditorSelectedIds()
  const displayIntervals = useWorkoutEditorDisplayIntervals()
  const ftp = useWorkoutEditorFtp()
  const displayMode = useWorkoutEditorDisplayMode()
  const dragPreview = useWorkoutEditorDragPreview()
  const activeReorderId = useWorkoutEditorActiveReorderId()
  const actions = useWorkoutEditorActions()
  const selectedIdSet = new Set(selectedIds)
  const { sensors, handleDragStart, handleDragEnd } = useReorderDnd({
    stableIds,
    actions,
  })

  const isDragging = activeDrag !== null || activeReorderId !== null
  const activeReorderIndex =
    activeReorderId !== null ? stableIds.indexOf(activeReorderId) : null
  const activeReorderInterval =
    activeReorderIndex !== null && activeReorderIndex !== -1
      ? displayIntervals[activeReorderIndex]
      : null

  return (
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
        onClick={actions.clearSelection}
      >
        <EditorGrid scale={scale} />

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
              />
            ) : null}
          </DragOverlay>
        </DndContext>

        {!isDragging &&
          displayIntervals.length >= 2 &&
          displayIntervals
            .slice(1)
            .map((_, index) => {
              const boundaryIndex = index + 1
              const leftId = stableIds[boundaryIndex - 1]
              const rightId = stableIds[boundaryIndex]
              const isBoundaryActive =
                (leftId !== undefined && selectedIdSet.has(leftId)) ||
                (rightId !== undefined && selectedIdSet.has(rightId))

              if (!isBoundaryActive) {
                return null
              }

              return (
                <InsertZone
                  key={`insert-${boundaryIndex}`}
                  x={scale.getIntervalX(boundaryIndex)}
                  index={boundaryIndex}
                  height={EDITOR_HEIGHT}
                />
              )
            })}

        {activeDrag && dragPreview && (
          <DragTooltip
            activeDrag={activeDrag}
            intervals={dragPreview}
            scale={scale}
            displayMode={displayMode}
            ftp={ftp}
            containerWidth={scale.contentWidth}
          />
        )}
      </div>
    </div>
  )
}
