import { Pause, Play, Square } from "lucide-react"
import { formatElapsedTime, formatMetricDistance } from "../../utils"
import type { RouteMapViewMode, RouteSpeedSource } from "../../types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type RouteRideHudProps = {
  distanceMeters: number
  elapsedSeconds: number
  gradePercent: number
  isPaused: boolean
  onPause: () => void
  onResume: () => void
  onSmoothingChange: (value: number) => void
  onStop: () => void
  onTerrainEnabledChange: (enabled: boolean) => void
  onViewModeChange: (mode: RouteMapViewMode) => void
  smoothingLevel: number
  speedKph: number
  speedSource: RouteSpeedSource
  terrainEnabled: boolean
  telemetryStatus: "missing" | "fresh" | "stale"
  totalDistanceMeters: number
  viewMode: RouteMapViewMode
}

export const RouteRideHud = ({
  distanceMeters,
  elapsedSeconds,
  gradePercent,
  isPaused,
  onPause,
  onResume,
  onSmoothingChange,
  onStop,
  onTerrainEnabledChange,
  onViewModeChange,
  smoothingLevel,
  speedKph,
  speedSource,
  terrainEnabled,
  telemetryStatus,
  totalDistanceMeters,
  viewMode,
}: RouteRideHudProps) => {
  const speedLabel =
    speedSource === "fallback"
      ? "Speed fallback"
      : speedSource === "physics"
        ? "Virtual speed"
        : speedSource === "paused-power-missing"
          ? "Power missing"
          : "Speed"

  return (
    <div className="absolute inset-x-3 bottom-4 mx-auto max-w-5xl rounded-lg border border-border/70 bg-card/95 p-3 shadow-xl backdrop-blur sm:bottom-5 sm:p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(4,minmax(0,1fr))_180px_auto_minmax(190px,auto)_auto] sm:items-center">
        <Metric label="Time" value={formatElapsedTime(elapsedSeconds)} />
        <Metric label={speedLabel} value={`${speedKph.toFixed(1)} km/h`} />
        <Metric
          label="Distance"
          value={`${formatMetricDistance(distanceMeters)} / ${formatMetricDistance(totalDistanceMeters)}`}
        />
        <Metric label="Grade" value={`${gradePercent.toFixed(1)}%`} />
        <div className="col-span-2 grid gap-1 sm:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs">Smoothing</Label>
            <span className="text-xs text-muted-foreground">
              {smoothingLevel}
            </span>
          </div>
          <Slider
            min={0}
            max={10}
            step={1}
            value={[smoothingLevel]}
            onValueChange={(value) =>
              onSmoothingChange(Array.isArray(value) ? (value[0] ?? 0) : value)
            }
          />
        </div>
        <div className="col-span-2 flex flex-wrap items-center gap-3 sm:col-span-1">
          <ToggleGroup
            aria-label="Map view mode"
            value={[viewMode]}
            size="sm"
            variant="outline"
          >
            <ToggleGroupItem
              aria-label="Top-down map view"
              value="top-down"
              onPressedChange={(pressed) => {
                if (pressed) onViewModeChange("top-down")
              }}
            >
              Top-down
            </ToggleGroupItem>
            <ToggleGroupItem
              aria-label="Perspective map view"
              value="perspective"
              onPressedChange={(pressed) => {
                if (pressed) onViewModeChange("perspective")
              }}
            >
              Perspective
            </ToggleGroupItem>
          </ToggleGroup>
          <Label className="flex items-center gap-2 text-xs">
            Terrain
            <Switch
              size="sm"
              checked={terrainEnabled}
              onCheckedChange={(checked) => onTerrainEnabledChange(checked)}
            />
          </Label>
        </div>
        <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
          {telemetryStatus === "stale" && (
            <span className="text-xs text-amber-600">Stale</span>
          )}
          {speedSource === "paused-power-missing" && (
            <span className="text-xs text-amber-600">Power required</span>
          )}
          <Button
            size="icon"
            variant="outline"
            onClick={isPaused ? onResume : onPause}
            aria-label={isPaused ? "Resume route" : "Pause route"}
          >
            {isPaused ? <Play /> : <Pause />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={onStop}
            aria-label="Stop route"
          >
            <Square />
          </Button>
        </div>
      </div>
    </div>
  )
}

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0">
    <div className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      {label}
    </div>
    <div className="truncate font-heading text-base font-semibold">{value}</div>
  </div>
)
