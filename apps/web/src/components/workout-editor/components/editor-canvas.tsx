import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core"
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useWorkoutEditorActions,
  useWorkoutEditorActiveReorderId,
  useWorkoutEditorActiveReorderOverId,
  useWorkoutEditorDisplayIntervals,
  useWorkoutEditorDisplayMode,
  useWorkoutEditorDragPreview,
  useWorkoutEditorFtp,
  useWorkoutEditorSelectedIds,
  useWorkoutEditorStableIds,
} from "../store"
import { useReorderDnd } from "../hooks/use-reorder-dnd"
import { EditorGrid } from "./editor-grid"
import { IntervalBlock } from "./interval-block"
import { DragTooltip } from "./drag-tooltip"
import { ReorderDragOverlay } from "./reorder-drag-overlay"
import { ReorderInsertionIndicator } from "./reorder-insertion-indicator"
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
  const displayIntervals = useWorkoutEditorDisplayIntervals()
  const ftp = useWorkoutEditorFtp()
  const displayMode = useWorkoutEditorDisplayMode()
  const dragPreview = useWorkoutEditorDragPreview()
  const activeReorderId = useWorkoutEditorActiveReorderId()
  const activeReorderOverId = useWorkoutEditorActiveReorderOverId()
  const selectedIds = useWorkoutEditorSelectedIds()
  const actions = useWorkoutEditorActions()
  const {
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragCancel,
    handleDragEnd,
  } = useReorderDnd({
    selectedIds,
    stableIds,
    actions,
  })

  const isDragging = activeDrag !== null || activeReorderId !== null
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
          onDragOver={handleDragOver}
          onDragCancel={handleDragCancel}
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

          {activeReorderId &&
            activeReorderOverId &&
            activeReorderId !== activeReorderOverId && (
              <ReorderInsertionIndicator
                activeId={activeReorderId}
                overId={activeReorderOverId}
                stableIds={stableIds}
                intervals={displayIntervals}
                scale={scale}
              />
            )}

          <DragOverlay dropAnimation={null}>
            {activeReorderId ? (
              <ReorderDragOverlay
                activeId={activeReorderId}
                intervals={displayIntervals}
                stableIds={stableIds}
                selectedIds={selectedIds}
                scale={scale}
              />
            ) : null}
          </DragOverlay>
        </DndContext>

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
