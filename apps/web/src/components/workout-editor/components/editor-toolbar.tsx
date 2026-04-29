import { useMemo, useState } from "react"
import {
  BoxSelect,
  ClipboardPaste,
  Copy,
  MessageSquareText,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react"
import { isApplePlatform } from "../utils/platform"
import {
  useWorkoutEditorActions,
  useWorkoutEditorCanCopy,
  useWorkoutEditorCanRedo,
  useWorkoutEditorCanUndo,
  useWorkoutEditorClipboardPreview,
  useWorkoutEditorDisplayMode,
  useWorkoutEditorFtp,
  useWorkoutEditorHasClipboard,
  useWorkoutEditorIntervals,
  useWorkoutEditorMultiSelectMode,
  useWorkoutEditorSelectedCount,
  useWorkoutEditorSelectedIds,
  useWorkoutEditorStableIds,
} from "../store"
import { EditorMinimap } from "./editor-minimap"
import { SelectionDetails } from "./selection-details"
import { ZoomControls } from "./zoom-controls"
import { ClipboardPreview } from "./clipboard-preview"
import type { TimelineZoom } from "@/hooks/use-timeline-zoom"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  MAX_INTERVAL_COMMENT_LENGTH,
  normalizeIntervalComment,
} from "@/lib/workout-utils"

interface EditorToolbarProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  edgeGutterPx: number
  zoom: TimelineZoom
}

export function EditorToolbar({
  scrollContainerRef,
  edgeGutterPx,
  zoom,
}: EditorToolbarProps) {
  const ftp = useWorkoutEditorFtp()
  const displayMode = useWorkoutEditorDisplayMode()
  const selectedCount = useWorkoutEditorSelectedCount()
  const intervals = useWorkoutEditorIntervals()
  const stableIds = useWorkoutEditorStableIds()
  const selectedIds = useWorkoutEditorSelectedIds()
  const multiSelectMode = useWorkoutEditorMultiSelectMode()
  const canCopy = useWorkoutEditorCanCopy()
  const canPaste = useWorkoutEditorHasClipboard()
  const canUndo = useWorkoutEditorCanUndo()
  const canRedo = useWorkoutEditorCanRedo()
  const clipboardData = useWorkoutEditorClipboardPreview()
  const actions = useWorkoutEditorActions()
  const applePlatform = isApplePlatform()
  const undoTitle = applePlatform ? "Undo (Cmd+Z)" : "Undo (Ctrl+Z)"
  const redoTitle = applePlatform
    ? "Redo (Cmd+Shift+Z)"
    : "Redo (Ctrl+Shift+Z / Ctrl+Y)"
  const [commentDialogOpen, setCommentDialogOpen] = useState(false)
  const [commentInput, setCommentInput] = useState("")
  const selectedComments = useMemo(() => {
    const selectedIdSet = new Set(selectedIds)
    return stableIds
      .map((id, index) =>
        selectedIdSet.has(id)
          ? normalizeIntervalComment(intervals[index]?.comment ?? "")
          : null
      )
      .filter((comment): comment is string => comment !== null)
  }, [intervals, selectedIds, stableIds])
  const sharedSelectedComment =
    selectedComments.length > 0 &&
    selectedComments.every((comment) => comment === selectedComments[0])
      ? selectedComments[0]
      : ""
  const hasMixedComments =
    selectedComments.length > 1 &&
    !selectedComments.every((comment) => comment === selectedComments[0])

  const openCommentDialog = () => {
    setCommentInput(sharedSelectedComment)
    setCommentDialogOpen(true)
  }

  const applyComment = () => {
    actions.setSelectedComment(commentInput)
    setCommentDialogOpen(false)
  }

  const hasSelection = selectedCount > 0

  return (
    <div className="mt-1.5 flex flex-col gap-1.5" data-selection-toolbar>
      {/* View */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-border/50 p-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={actions.undo}
            disabled={!canUndo}
            title={undoTitle}
          >
            <Undo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={actions.redo}
            disabled={!canRedo}
            title={redoTitle}
          >
            <Redo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => actions.pasteClipboard()}
            disabled={!canPaste}
            title="Paste (Cmd/Ctrl+V)"
          >
            <ClipboardPaste />
          </Button>

          {clipboardData && (
            <ClipboardPreview
              clipboardIntervals={clipboardData.intervals}
              gapBefore={clipboardData.gapBefore}
              ftp={ftp}
              displayMode={displayMode}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <EditorMinimap
            scrollContainerRef={scrollContainerRef}
            pixelsPerSecond={zoom.pixelsPerSecond}
            edgeGutterPx={edgeGutterPx}
          />
        </div>

        <ZoomControls
          zoomLevel={zoom.zoomLevel}
          canZoomIn={zoom.canZoomIn}
          canZoomOut={zoom.canZoomOut}
          onZoomIn={zoom.zoomIn}
          onZoomOut={zoom.zoomOut}
          onResetZoom={zoom.resetZoom}
        />
      </div>
      {/* Selection */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-border/50 p-1">
            <Button
              variant={multiSelectMode ? "default" : "ghost"}
              size="icon-sm"
              onClick={actions.toggleMultiSelect}
              title={
                multiSelectMode
                  ? "Multi-select on — click to disable"
                  : "Multi-select — plain clicks will toggle selection"
              }
              aria-pressed={multiSelectMode}
            >
              <BoxSelect />
            </Button>

            {hasSelection && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={openCommentDialog}
                  title="Add comment"
                >
                  <MessageSquareText />
                </Button>
                <Button
                  variant="destructive"
                  size="icon-sm"
                  onClick={actions.deleteSelection}
                  title="Delete selected (Delete)"
                >
                  <Trash2 />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={actions.copySelection}
                  disabled={!canCopy}
                  title="Copy (Cmd/Ctrl+C)"
                >
                  <Copy />
                </Button>
              </>
            )}
          </div>
        </div>

        {hasSelection && <SelectionDetails />}
      </div>

      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent
          className="max-w-sm gap-4 rounded-2xl p-4"
          data-selection-toolbar
        >
          <DialogHeader>
            <DialogTitle>Interval comment</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              applyComment()
            }}
          >
            <Input
              value={commentInput}
              onChange={(event) => setCommentInput(event.target.value)}
              placeholder={hasMixedComments ? "Mixed comments" : undefined}
              maxLength={MAX_INTERVAL_COMMENT_LENGTH}
              autoFocus
            />
            <DialogFooter>
              <Button type="submit" onClick={applyComment}>
                {normalizeIntervalComment(commentInput)
                  ? "Apply"
                  : "Clear comments"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
