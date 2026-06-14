import { useMemo } from "react"
import { Plus } from "lucide-react"
import { getDayFullLabel, getDayShortLabel } from "./utils"
import type { PlanEditorSlot } from "../../types"
import { WorkoutMini } from "@/components/workout-mini"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getWorkoutDisplayMetrics } from "@/lib/workout-metrics"

interface DayCardProps {
  slot: PlanEditorSlot
  active: boolean
  onClick: () => void
}

export function DayCard({ slot, active, onClick }: DayCardProps) {
  const workout = slot.workout
  const metrics = useMemo(
    () => (workout ? getWorkoutDisplayMetrics(workout.intervals) : null),
    [workout]
  )

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={
        workout
          ? `Select ${getDayFullLabel(slot.dayIndex)}, ${workout.title} assigned`
          : `Select ${getDayFullLabel(slot.dayIndex)}, no workout assigned`
      }
      className={cn(
        "flex min-h-44 w-full flex-col rounded-xl border border-border/60 bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/30",
        !workout && "border-dashed bg-muted/15",
        active && "border-primary ring-2 ring-primary/30"
      )}
    >
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        {getDayShortLabel(slot.dayIndex)}
      </div>

      {workout && metrics ? (
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <WorkoutMini
            intervals={workout.intervals}
            className="h-14 w-full rounded-md bg-muted/40"
            compact
          />
          <div className="line-clamp-2 text-sm leading-snug font-medium">
            {workout.title}
          </div>
          <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{metrics.durationLabel}</span>
            <span aria-hidden>·</span>
            <span>{metrics.stressScore} TSS</span>
            <Badge
              variant="outline"
              className="ml-auto"
              style={{
                color: metrics.zoneInfo.color,
                borderColor: metrics.zoneInfo.colorMuted,
              }}
            >
              {metrics.zoneLabel}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Plus className="size-4" />
          Add workout
        </div>
      )}
    </button>
  )
}
