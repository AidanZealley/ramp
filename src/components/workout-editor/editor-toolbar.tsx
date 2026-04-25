import { BoxSelect, ClipboardPaste, Copy, Trash2 } from "lucide-react"
import { EditorMinimap } from "./editor-minimap"
import { ZoomControls } from "./zoom-controls"
import { ClipboardPreview } from "./clipboard-preview"
import type { Interval } from "@/lib/workout-utils"
import type { TimelineZoom } from "@/hooks/use-timeline-zoom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface EditorToolbarProps {
  intervals: Array<Interval>
  ftp: number
  powerMode: "absolute" | "percentage"
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  zoom: TimelineZoom
  // Selection controls
  selectedCount: number
  multiSelectMode: boolean
  canCopy: boolean
  onToggleMultiSelect: () => void
  onCopy: () => void
  onRequestDelete: () => void
  canPaste: boolean
  onPaste: () => void
  // Selection + clipboard data for minimap overlay & preview
  selectedIds: Array<string>
  stableIds: Array<string>
  clipboardData: {
    intervals: Array<Interval>
    gapBefore: boolean[]
  } | null
}

export function EditorToolbar({
  intervals,
  ftp,
  powerMode,
  scrollContainerRef,
  zoom,
  selectedCount,
  multiSelectMode,
  canCopy,
  onToggleMultiSelect,
  onCopy,
  onRequestDelete,
  canPaste,
  onPaste,
  selectedIds,
  stableIds,
  clipboardData,
}: EditorToolbarProps) {
  return (
    <div className="mt-1.5 flex items-center gap-2" data-selection-toolbar>
      {/* Selection tools — multi-select toggle + count + delete */}
      <div className="flex items-center gap-1 rounded-full border border-border/50 p-1">
        <Button
          variant={multiSelectMode ? "default" : "ghost"}
          size="icon-sm"
          onClick={onToggleMultiSelect}
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
              onClick={onRequestDelete}
              title="Delete selected (Delete)"
            >
              <Trash2 />
            </Button>
          </>
        )}
      </div>

      {/* Clipboard — copy button + preview thumbnail */}
      <div className="flex items-center gap-1 rounded-full border border-border/50 p-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCopy}
          disabled={!canCopy}
          title="Copy (Cmd/Ctrl+C)"
        >
          <Copy />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPaste}
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

      {/* Minimap — navigation overview with selection highlights */}
      <div className="min-w-0 flex-1">
        {zoom.zoomLevel > 1 && (
          <EditorMinimap
            intervals={intervals}
            ftp={ftp}
            powerMode={powerMode}
            scrollContainerRef={scrollContainerRef}
            pixelsPerSecond={zoom.pixelsPerSecond}
            selectedIds={selectedIds}
            stableIds={stableIds}
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
