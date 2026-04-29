import {
  BoxSelect,
  ClipboardPaste,
  Copy,
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
  useWorkoutEditorMultiSelectMode,
  useWorkoutEditorSelectedCount,
} from "../store"
import { EditorMinimap } from "./editor-minimap"
import { ZoomControls } from "./zoom-controls"
import { ClipboardPreview } from "./clipboard-preview"
import type { TimelineZoom } from "@/hooks/use-timeline-zoom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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

  return (
    <div className="mt-1.5 flex items-center gap-2" data-selection-toolbar>
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

        {selectedCount > 0 && (
          <>
            <Badge variant="secondary">{selectedCount} selected</Badge>
            <Button
              variant="destructive"
              size="icon-sm"
              onClick={actions.deleteSelection}
              title="Delete selected (Delete)"
            >
              <Trash2 />
            </Button>
          </>
        )}
      </div>

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
          onClick={actions.copySelection}
          disabled={!canCopy}
          title="Copy (Cmd/Ctrl+C)"
        >
          <Copy />
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
        {zoom.zoomLevel > 1 && (
          <EditorMinimap
            scrollContainerRef={scrollContainerRef}
            pixelsPerSecond={zoom.pixelsPerSecond}
            edgeGutterPx={edgeGutterPx}
          />
        )}
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
  )
}
