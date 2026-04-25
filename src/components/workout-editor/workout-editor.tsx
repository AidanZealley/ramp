import { forwardRef, useImperativeHandle, useRef } from "react"
import type { Interval } from "@/lib/workout-utils"
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
  useWorkoutEditorDisplayIntervals,
  useWorkoutEditorFtp,
  useWorkoutEditorHasClipboard,
  useWorkoutEditorIntervals,
  useWorkoutEditorPowerMode,
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
      powerMode,
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
      powerMode,
      pixelsPerSecond: zoom.pixelsPerSecond,
      onPreviewChange: actions.setDragPreview,
      onCommit: actions.commitIntervals,
    })

    const isDragging = activeDrag !== null || activeReorderId !== null
    const maxPower = computeMaxPower(displayIntervals, powerMode)

    useEditorKeypresses({
      actions,
      isDragging,
      selectedCount,
      stableIdsLength: stableIds.length,
      hasClipboard,
      powerMode,
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
        <EditorAxis scale={scale} powerMode={powerMode} />

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
            powerMode={powerMode}
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
