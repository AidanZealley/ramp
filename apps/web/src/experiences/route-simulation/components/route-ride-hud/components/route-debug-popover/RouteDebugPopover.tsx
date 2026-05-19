import { Activity } from "lucide-react"
import { smoothingLevelToMeters } from "../../../../utils"
import type {
  LastGradeDispatch,
  RouteSpeedSource,
} from "../../../../types"
import type { RouteGradeDiagnostics } from "@/lib/routes/simulation"
import type { RoutePoint } from "@/lib/routes/types"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type RouteDebugPopoverProps = {
  diagnostics: RouteGradeDiagnostics | null
  displayedGradePercent: number
  lastGradeDispatch: LastGradeDispatch | null
  riderPosition: RoutePoint | null
  smoothingLevel: number
  speedSource: RouteSpeedSource
  telemetryStatus: "missing" | "fresh" | "stale"
}

export const RouteDebugPopover = ({
  diagnostics,
  displayedGradePercent,
  lastGradeDispatch,
  riderPosition,
  smoothingLevel,
  speedSource,
  telemetryStatus,
}: RouteDebugPopoverProps) => {
  const smoothingMeters = smoothingLevelToMeters(smoothingLevel)

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button size="icon" variant="outline" aria-label="Route grade debug">
            <Activity />
          </Button>
        }
      />
      <PopoverContent
        side="top"
        sideOffset={24}
        align="end"
        className="w-72 rounded-lg p-3"
      >
        <div className="grid gap-2 text-xs">
          <DebugRow
            label="Route distance"
            value={formatMeters(diagnostics?.distanceMeters)}
          />
          <DebugRow
            label="Rider lat/lng"
            value={
              riderPosition
                ? `${riderPosition.lat.toFixed(6)}, ${riderPosition.lng.toFixed(6)}`
                : "--"
            }
          />
          <DebugRow
            label="GPX elevation"
            value={formatNullableMeters(diagnostics?.elevationMeters ?? null)}
          />
          <DebugRow
            label="Raw grade"
            value={formatPercent(diagnostics?.rawGradePercent)}
          />
          <DebugRow
            label="Displayed grade"
            value={formatPercent(displayedGradePercent)}
          />
          <DebugRow label="Smoothing" value={`${smoothingMeters} m`} />
          <DebugRow
            label="Trainer grade"
            value={
              lastGradeDispatch
                ? `${formatPercent(lastGradeDispatch.gradePercent)} @ ${formatMeters(lastGradeDispatch.distanceMeters)}`
                : "--"
            }
          />
          <DebugRow label="Telemetry" value={telemetryStatus} />
          <DebugRow label="Speed source" value={speedSource} />
        </div>
      </PopoverContent>
    </Popover>
  )
}

const DebugRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-muted-foreground">{label}</span>
    <span className="truncate font-mono text-right tabular-nums">{value}</span>
  </div>
)

function formatMeters(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(1)} m`
    : "--"
}

function formatNullableMeters(value: number | null): string {
  return value !== null && Number.isFinite(value) ? `${value.toFixed(1)} m` : "--"
}

function formatPercent(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(1)}%`
    : "--"
}
