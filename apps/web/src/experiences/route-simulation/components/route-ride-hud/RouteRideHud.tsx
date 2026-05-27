import { Pause, Play, RotateCcw, Square } from "lucide-react"
import { formatElapsedTime, formatMetricDistance } from "../../utils"
import { RouteDebugPopover } from "./components/route-debug-popover"
import { RouteSettingsPopover } from "./components/route-settings-popover"
import type {
  LastGradeDispatch,
  RouteMapViewMode,
  RouteSpeedSource,
} from "../../types"
import type { RouteGradeDiagnostics } from "@/lib/routes/simulation"
import type { RoutePoint } from "@/lib/routes/types"
import { Button } from "@/components/ui/button"

type RouteRideHudProps = {
  distanceMeters: number
  elapsedSeconds: number
  gradeDiagnostics: RouteGradeDiagnostics | null
  gradePercent: number
  isComplete: boolean
  isPaused: boolean
  lastGradeDispatch: LastGradeDispatch | null
  onPause: () => void
  onResume: () => void
  onRestart: () => void
  onSmoothingChange: (value: number) => void
  onStop: () => void
  onTerrainEnabledChange: (enabled: boolean) => void
  onViewModeChange: (mode: RouteMapViewMode) => void
  smoothingLevel: number
  powerWatts: number | null
  riderPosition: RoutePoint | null
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
  gradeDiagnostics,
  gradePercent,
  isComplete,
  isPaused,
  lastGradeDispatch,
  onPause,
  onResume,
  onRestart,
  onSmoothingChange,
  onStop,
  onTerrainEnabledChange,
  onViewModeChange,
  smoothingLevel,
  powerWatts,
  riderPosition,
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
    <div className="absolute inset-x-3 bottom-4 mx-auto max-w-6xl rounded-lg border border-border/60 bg-card/80 p-3 shadow-xl backdrop-blur sm:bottom-5 sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[auto_minmax(5.5rem,0.7fr)_minmax(15rem,1.8fr)_minmax(5.5rem,0.7fr)_auto] lg:items-center">
        <div className="flex items-center justify-center gap-2 lg:justify-start">
          <Button
            size="icon"
            variant="outline"
            onClick={isComplete ? onRestart : isPaused ? onResume : onPause}
            aria-label={
              isComplete
                ? "Restart route"
                : isPaused
                  ? "Resume route"
                  : "Pause route"
            }
          >
            {isComplete ? <RotateCcw /> : isPaused ? <Play /> : <Pause />}
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

        <Metric
          align="center"
          label="Time"
          value={formatElapsedTime(elapsedSeconds)}
        />

        <div className="min-w-0">
          <Metric
            align="center"
            label="Power"
            size="hero"
            value={powerWatts !== null ? `${Math.round(powerWatts)} W` : "-- W"}
          />
          <div className="mt-3 grid grid-cols-2 divide-x divide-border/70 rounded-md border border-border/60 bg-background/40">
            <Metric
              align="center"
              className="px-3 py-2"
              label={speedLabel}
              value={`${speedKph.toFixed(1)} km/h`}
            />
            <Metric
              align="center"
              className="px-3 py-2"
              label="Distance"
              value={`${formatMetricDistance(distanceMeters)} / ${formatMetricDistance(totalDistanceMeters)}`}
            />
          </div>
        </div>

        <Metric
          align="center"
          label="Grade"
          value={`${gradePercent.toFixed(1)}%`}
        />

        <div className="flex items-center justify-center gap-2 lg:justify-end">
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
          {import.meta.env.DEV && (
            <RouteDebugPopover
              diagnostics={gradeDiagnostics}
              displayedGradePercent={gradePercent}
              lastGradeDispatch={lastGradeDispatch}
              riderPosition={riderPosition}
              smoothingLevel={smoothingLevel}
              speedSource={speedSource}
              telemetryStatus={telemetryStatus}
            />
          )}
        </div>
      </div>
    </div>
  )
}

const Metric = ({
  align = "left",
  className = "",
  label,
  size = "default",
  value,
}: {
  align?: "left" | "center"
  className?: string
  label: string
  size?: "default" | "hero"
  value: string
}) => (
  <div
    className={[
      "min-w-0",
      align === "center" ? "text-center" : "",
      className,
    ].join(" ")}
  >
    <div className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      {label}
    </div>
    <div
      className={[
        "truncate font-heading font-semibold tabular-nums",
        size === "hero" ? "text-4xl sm:text-5xl" : "text-base sm:text-lg",
      ].join(" ")}
    >
      {value}
    </div>
  </div>
)
