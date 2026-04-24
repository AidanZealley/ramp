import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"

interface ZoomControlsProps {
  zoomLevel: number
  canZoomIn: boolean
  canZoomOut: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
}

export function ZoomControls({
  zoomLevel,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: ZoomControlsProps) {
  const isAtFit = zoomLevel <= 1

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border/50 px-0.5 py-0.5">
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={!canZoomOut}
        onClick={onZoomOut}
      >
        <Minus />
      </Button>

      <button
        className="min-w-12 px-1 text-center text-[10px] text-muted-foreground tabular-nums transition-colors hover:text-foreground"
        onClick={onResetZoom}
        title="Reset to fit"
      >
        {isAtFit ? "Fit" : `${zoomLevel.toFixed(1)}x`}
      </button>

      <Button
        variant="ghost"
        size="icon-xs"
        disabled={!canZoomIn}
        onClick={onZoomIn}
      >
        <Plus />
      </Button>
    </div>
  )
}
