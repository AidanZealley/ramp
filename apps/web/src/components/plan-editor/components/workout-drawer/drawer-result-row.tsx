import { useMemo } from "react"
import type { WorkoutDoc } from "./types"
import { WorkoutMini } from "@/components/workout-mini"
import { Badge } from "@/components/ui/badge"
import { getWorkoutDisplayMetrics } from "@/lib/workout-metrics"

interface DrawerResultRowProps {
  workout: WorkoutDoc
  onSelect: () => void
}

export function DrawerResultRow({ workout, onSelect }: DrawerResultRowProps) {
  const metrics = useMemo(
    () => getWorkoutDisplayMetrics(workout.intervals),
    [workout]
  )

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition-colors hover:border-border/60 hover:bg-muted/40"
    >
      <WorkoutMini
        intervals={workout.intervals}
        className="h-10 w-20 shrink-0 rounded-md bg-muted/40"
        compact
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{workout.title}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{metrics.durationLabel}</span>
          <span aria-hidden>·</span>
          <span>{metrics.stressScore} TSS</span>
          <span aria-hidden>·</span>
          <span>IF {metrics.intensityFactor.toFixed(2)}</span>
        </div>
      </div>
      <Badge
        variant="outline"
        style={{
          color: metrics.zoneInfo.color,
          borderColor: metrics.zoneInfo.colorMuted,
        }}
      >
        {metrics.zoneLabel}
      </Badge>
    </button>
  )
}
