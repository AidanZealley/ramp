import { BoxSelect, Copy, Trash2 } from "lucide-react"
import { EditorMinimap } from "./editor-minimap"
import { ZoomControls } from "./zoom-controls"
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
}: EditorToolbarProps) {
  return (
    <div className="mt-1.5 flex items-center gap-2" data-selection-toolbar>
      {/* Selection tools — always visible so users can enter multi-select mode anytime */}
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
              variant="ghost"
              size="icon-sm"
              onClick={onCopy}
              disabled={!canCopy}
              title="Copy (Cmd/Ctrl+C)"
            >
              <Copy />
            </Button>
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

      <div className="min-w-0 flex-1">
        {zoom.zoomLevel > 1 && (
          <EditorMinimap
            intervals={intervals}
            ftp={ftp}
            powerMode={powerMode}
            scrollContainerRef={scrollContainerRef}
            pixelsPerSecond={zoom.pixelsPerSecond}
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
