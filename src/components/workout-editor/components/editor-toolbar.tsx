import { BoxSelect, ClipboardPaste, Copy, Trash2 } from "lucide-react"
import { EditorMinimap } from "./editor-minimap"
import { ZoomControls } from "./zoom-controls"
import { ClipboardPreview } from "./clipboard-preview"
import type { TimelineZoom } from "@/hooks/use-timeline-zoom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  useWorkoutEditorActions,
  useWorkoutEditorCanCopy,
  useWorkoutEditorClipboardPreview,
  useWorkoutEditorFtp,
  useWorkoutEditorHasClipboard,
  useWorkoutEditorMultiSelectMode,
  useWorkoutEditorPowerMode,
  useWorkoutEditorSelectedCount,
} from "../store"

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
  const powerMode = useWorkoutEditorPowerMode()
  const selectedCount = useWorkoutEditorSelectedCount()
  const multiSelectMode = useWorkoutEditorMultiSelectMode()
  const canCopy = useWorkoutEditorCanCopy()
  const canPaste = useWorkoutEditorHasClipboard()
  const clipboardData = useWorkoutEditorClipboardPreview()
  const actions = useWorkoutEditorActions()

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
              onClick={actions.requestDelete}
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
            powerMode={powerMode}
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
