import { forwardRef, useImperativeHandle, useRef } from "react"
import type { Interval, PowerDisplayMode } from "@/lib/workout-utils"
import { computeMaxPower } from "@/lib/workout-utils"
import { TIMELINE_EDGE_GUTTER } from "@/lib/timeline/types"
import { useIntervalDrag } from "@/hooks/use-interval-drag"
import { EditorAxis } from "./components/editor-axis"
import { EditorCanvas } from "./components/editor-canvas"
import { EditorToolbar } from "./components/editor-toolbar"
import { FtpBadge } from "./components/ftp-badge"
import {
  WorkoutEditorStoreProvider,
  useWorkoutEditorActions,
  useWorkoutEditorActiveReorderId,
  useWorkoutEditorDisplayMode,
  useWorkoutEditorDisplayIntervals,
  useWorkoutEditorFtp,
  useWorkoutEditorHasClipboard,
  useWorkoutEditorIntervals,
  useWorkoutEditorSelectedCount,
  useWorkoutEditorSelectedIds,
  useWorkoutEditorStableIds,
} from "./store"
import { useClearSelectionOnOutsideClick } from "./hooks/use-clear-selection-on-outside-click"
import { useEditorAutoScroll } from "./hooks/use-editor-auto-scroll"
import { useEditorInsertInterval } from "./hooks/use-editor-insert-interval"
import { useEditorKeypresses } from "./hooks/use-editor-keypresses"
import { useEditorZoom } from "./hooks/use-editor-zoom"

export interface WorkoutEditorHandle {
  insertInterval: () => void
}

interface WorkoutEditorProps {
  intervals: Array<Interval>
  displayMode: PowerDisplayMode
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
    const displayMode = useWorkoutEditorDisplayMode()
    const ftp = useWorkoutEditorFtp()
    const selectedIds = useWorkoutEditorSelectedIds()
    const selectedCount = useWorkoutEditorSelectedCount()
    const stableIds = useWorkoutEditorStableIds()
    const hasClipboard = useWorkoutEditorHasClipboard()
    const activeReorderId = useWorkoutEditorActiveReorderId()
    const actions = useWorkoutEditorActions()

    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<HTMLDivElement>(null)

    const { zoom, toolbarZoom, scale } = useEditorZoom({
      displayIntervals,
      selectedIds,
      stableIds,
      scrollContainerRef,
    })

    const insertInterval = useEditorInsertInterval({
      intervalsLength: intervals.length,
      selectedIds,
      stableIds,
      actions,
    })

    const { activeDrag, startDrag } = useIntervalDrag({
      intervals,
      pixelsPerSecond: zoom.pixelsPerSecond,
      onPreviewChange: actions.setDragPreview,
      onCommit: actions.commitIntervals,
    })

    const isDragging = activeDrag !== null || activeReorderId !== null
    const maxPower = computeMaxPower(displayIntervals)

    useEditorKeypresses({
      actions,
      isDragging,
      selectedCount,
      stableIdsLength: stableIds.length,
      hasClipboard,
    })

    useEditorAutoScroll({
      intervals,
      selectedIds,
      stableIds,
      scale,
      pixelsPerSecond: zoom.pixelsPerSecond,
      scrollContainerRef,
    })

    useClearSelectionOnOutsideClick({ editorRef, actions })

    useImperativeHandle(
      ref,
      () => ({
        insertInterval,
      }),
      [insertInterval]
    )

    return (
      <div className="flex select-none">
        <EditorAxis scale={scale} displayMode={displayMode} ftp={ftp} />

        <div className="relative min-w-0 flex-1">
          <EditorCanvas
            scrollContainerRef={scrollContainerRef}
            editorRef={editorRef}
            scale={scale}
            activeDrag={activeDrag}
            startDrag={startDrag}
          />

          <FtpBadge
            scale={scale}
            ftp={ftp}
            displayMode={displayMode}
            maxPower={maxPower}
          />

          <EditorToolbar
            scrollContainerRef={scrollContainerRef}
            edgeGutterPx={TIMELINE_EDGE_GUTTER}
            zoom={toolbarZoom}
          />
        </div>
      </div>
    )
  }
)
