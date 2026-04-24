import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, MinusSignIcon } from "@hugeicons/core-free-icons";

interface ZoomControlsProps {
  zoomLevel: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export function ZoomControls({
  zoomLevel,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: ZoomControlsProps) {
  const isAtFit = zoomLevel <= 1;

  return (
    <div className="absolute bottom-1 right-1 z-10 flex items-center gap-0.5 rounded-lg border border-border/50 bg-background/80 px-0.5 py-0.5 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={!canZoomOut}
        onClick={onZoomOut}
      >
        <HugeiconsIcon icon={MinusSignIcon} />
      </Button>

      <button
        className="min-w-[3rem] px-1 text-center text-[10px] tabular-nums text-muted-foreground hover:text-foreground transition-colors"
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
        <HugeiconsIcon icon={Add01Icon} />
      </Button>
    </div>
  );
}
