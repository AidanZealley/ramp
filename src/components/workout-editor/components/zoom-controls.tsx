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
    <div className="flex items-center gap-0.5 rounded-full border border-border/50 p-1">
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={!canZoomOut}
        onClick={onZoomOut}
      >
        <Minus />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onResetZoom}
        title="Reset to fit"
        className="text-xs"
      >
        {isAtFit ? "Fit" : `${zoomLevel.toFixed(1)}x`}
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        disabled={!canZoomIn}
        onClick={onZoomIn}
      >
        <Plus />
      </Button>
    </div>
  )
}
