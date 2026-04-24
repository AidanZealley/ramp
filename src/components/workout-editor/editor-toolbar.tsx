import type { Interval } from "@/lib/workout-utils"
import type { TimelineZoom } from "@/hooks/use-timeline-zoom"
import { EditorMinimap } from "./editor-minimap"
import { ZoomControls } from "./zoom-controls"

interface EditorToolbarProps {
  intervals: Interval[]
  ftp: number
  powerMode: "absolute" | "percentage"
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  zoom: TimelineZoom
}

export function EditorToolbar({
  intervals,
  ftp,
  powerMode,
  scrollContainerRef,
  zoom,
}: EditorToolbarProps) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="min-w-0 flex-1">
        {zoom.zoomLevel > 1 && (
          <EditorMinimap
            intervals={intervals}
            ftp={ftp}
            powerMode={powerMode}
            scrollContainerRef={scrollContainerRef}
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
