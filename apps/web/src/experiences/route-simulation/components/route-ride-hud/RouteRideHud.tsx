import { Pause, Play, Square } from "lucide-react"
import { formatElapsedTime, formatMetricDistance } from "../../utils"
import { RouteSettingsPopover } from "./components/route-settings-popover"
import type { RouteMapViewMode, RouteSpeedSource } from "../../types"
import { Button } from "@/components/ui/button"

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto] sm:items-center">
        <Metric label="Time" value={formatElapsedTime(elapsedSeconds)} />
        <Metric label={speedLabel} value={`${speedKph.toFixed(1)} km/h`} />
        <Metric
          label="Distance"
          value={`${formatMetricDistance(distanceMeters)} / ${formatMetricDistance(totalDistanceMeters)}`}
        />
        <Metric label="Grade" value={`${gradePercent.toFixed(1)}%`} />
        <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
          {telemetryStatus === "stale" && (
            <span className="text-xs text-amber-600">Stale</span>
          )}
          {speedSource === "paused-power-missing" && (
            <span className="text-xs text-amber-600">Power required</span>
          )}
          <RouteSettingsPopover
            onSmoothingChange={onSmoothingChange}
            onTerrainEnabledChange={onTerrainEnabledChange}
            onViewModeChange={onViewModeChange}
            smoothingLevel={smoothingLevel}
            terrainEnabled={terrainEnabled}
            viewMode={viewMode}
          />
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
