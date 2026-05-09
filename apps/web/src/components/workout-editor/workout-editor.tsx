import { useCallback, useMemo, useRef } from "react"
import { EditorAxis } from "./components/editor-axis"
import { EditorCanvas } from "./components/editor-canvas"
import { EditorToolbar } from "./components/editor-toolbar"
import { EditFeedbackBubble } from "./components/edit-feedback-bubble"
import { FtpBadge } from "./components/ftp-badge"
import {
  useWorkoutEditorActions,
  useWorkoutEditorActiveReorderId,
  useWorkoutEditorDisplayIntervals,
  useWorkoutEditorDisplayMode,
  useWorkoutEditorFtp,
  useWorkoutEditorHasClipboard,
  useWorkoutEditorIntervals,
  useWorkoutEditorSelectedCount,
  useWorkoutEditorSelectedIds,
  useWorkoutEditorSelectedSection,
  useWorkoutEditorStableIds,
} from "./store"
import { useClearSelectionOnOutsideClick } from "./hooks/use-clear-selection-on-outside-click"
import { useEditFeedbackBubble } from "./hooks/use-edit-feedback-bubble"
import { useEditorAutoScroll } from "./hooks/use-editor-auto-scroll"
import { useEditorKeypresses } from "./hooks/use-editor-keypresses"
import { useEditorZoom } from "./hooks/use-editor-zoom"
import { useIntervalDrag } from "@/hooks/use-interval-drag"
import {
  MIN_DURATION,
  MIN_POWER,
  TIMELINE_EDGE_GUTTER,
  type DragType,
} from "@/lib/timeline/types"
import {
  clamp,
  computeMaxPower,
  formatDuration,
  formatPowerWithSecondary,
  type Interval,
} from "@/lib/workout-utils"

const FEEDBACK_DRAG_TYPES = new Set<DragType>([
  "power-uniform",
  "power-start",
  "power-end",
  "duration",
  "duration-left",
])

export function WorkoutEditor() {
  const intervals = useWorkoutEditorIntervals()
  const displayIntervals = useWorkoutEditorDisplayIntervals()
  const displayMode = useWorkoutEditorDisplayMode()
  const ftp = useWorkoutEditorFtp()
  const selectedIds = useWorkoutEditorSelectedIds()
  const selectedCount = useWorkoutEditorSelectedCount()
  const selectedSection = useWorkoutEditorSelectedSection()
  const stableIds = useWorkoutEditorStableIds()
  const hasClipboard = useWorkoutEditorHasClipboard()
  const activeReorderId = useWorkoutEditorActiveReorderId()
  const actions = useWorkoutEditorActions()
  const { message: feedbackMessage, showMessage: showFeedbackMessage } =
    useEditFeedbackBubble()

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  const formatEditFeedback = useCallback(
    (interval: Interval) =>
      `${formatDuration(interval.durationSeconds)} · ${formatPowerWithSecondary(
        interval,
        displayMode,
        ftp
      )}`,
    [displayMode, ftp]
  )

  const { zoom, toolbarZoom, scale } = useEditorZoom({
    displayIntervals,
    selectedIds,
    stableIds,
    scrollContainerRef,
  })

  const showSingleIntervalFeedback = useCallback(
    (interval: Interval | undefined) => {
      if (!interval) return
      showFeedbackMessage(formatEditFeedback(interval))
    },
    [formatEditFeedback, showFeedbackMessage]
  )

  const { activeDrag, startDrag } = useIntervalDrag({
    intervals,
    pixelsPerSecond: zoom.pixelsPerSecond,
    onPreviewChange: actions.setDragPreview,
    onEditPreview: (payload) => {
      if (!FEEDBACK_DRAG_TYPES.has(payload.type)) return
      showSingleIntervalFeedback(payload.intervals[payload.index])
    },
    onCommit: actions.commitIntervals,
  })

  const isDragging = activeDrag !== null || activeReorderId !== null
  const maxPower = computeMaxPower(displayIntervals)

  const feedbackActions = useMemo(
    () => ({
      ...actions,
      nudgeSelectedPower: (delta: number) => {
        if (selectedIds.length === 1) {
          const index = stableIds.indexOf(selectedIds[0])
          const interval = intervals[index]
          if (interval) {
            const currentMaxPower = computeMaxPower(intervals)
            showSingleIntervalFeedback({
              ...interval,
              startPower: clamp(
                interval.startPower + delta,
                MIN_POWER,
                currentMaxPower
              ),
              endPower: clamp(
                interval.endPower + delta,
                MIN_POWER,
                currentMaxPower
              ),
            })
          }
        }
        actions.nudgeSelectedPower(delta)
      },
      nudgeSelectedSectionPower: (delta: number) => {
        if (selectedIds.length === 1 && selectedSection) {
          const index = stableIds.indexOf(selectedSection.intervalId)
          const interval = intervals[index]
          if (interval) {
            const currentMaxPower = computeMaxPower(intervals)
            showSingleIntervalFeedback({
              ...interval,
              startPower:
                selectedSection.target === "power-end"
                  ? interval.startPower
                  : clamp(
                      interval.startPower + delta,
                      MIN_POWER,
                      currentMaxPower
                    ),
              endPower:
                selectedSection.target === "power-start"
                  ? interval.endPower
                  : clamp(
                      interval.endPower + delta,
                      MIN_POWER,
                      currentMaxPower
                    ),
            })
          }
        }
        actions.nudgeSelectedSectionPower(delta)
      },
      nudgeSelectedDuration: (delta: number) => {
        if (selectedIds.length === 1) {
          const index = stableIds.indexOf(selectedIds[0])
          const interval = intervals[index]
          if (interval) {
            showSingleIntervalFeedback({
              ...interval,
              durationSeconds: Math.max(
                MIN_DURATION,
                interval.durationSeconds + delta
              ),
            })
          }
        }
        actions.nudgeSelectedDuration(delta)
      },
    }),
    [
      actions,
      intervals,
      selectedIds,
      selectedSection,
      showSingleIntervalFeedback,
      stableIds,
    ]
  )

  useEditorKeypresses({
    actions: feedbackActions,
    isDragging,
    selectedCount,
    hasSelectedSection: selectedSection !== null,
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

  return (
    <div className="flex select-none">
      <EditorAxis scale={scale} displayMode={displayMode} ftp={ftp} />

      <div className="relative flex min-w-0 flex-1 flex-col gap-3">
        <EditFeedbackBubble message={feedbackMessage} />

        <EditorCanvas
          scrollContainerRef={scrollContainerRef}
          editorRef={editorRef}
          scale={scale}
          activeDrag={activeDrag}
          startDrag={startDrag}
        />

        <FtpBadge scale={scale} ftp={ftp} maxPower={maxPower} />

        <EditorToolbar
          scrollContainerRef={scrollContainerRef}
          edgeGutterPx={TIMELINE_EDGE_GUTTER}
          zoom={toolbarZoom}
        />
      </div>
    </div>
  )
}
