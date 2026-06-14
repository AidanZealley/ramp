import { ChevronRight, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useMemo } from "react"
import { getDayFullLabel } from "../week-view"
import type { PlanEditorSlot } from "../../types"
import { WorkoutMini } from "@/components/workout-mini"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getWorkoutDisplayMetrics } from "@/lib/workout-metrics"

interface SelectedWorkoutPanelProps {
  slot: PlanEditorSlot
  onOpenPicker: () => void
  onRemoveWorkout: () => void
  onViewWorkoutDetails: () => void
}

function Metric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0">
      <div className="font-heading text-xl leading-none font-medium">
        {value}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

export const SelectedWorkoutPanel = ({
  slot,
  onOpenPicker,
  onRemoveWorkout,
  onViewWorkoutDetails,
}: SelectedWorkoutPanelProps) => {
  const workout = slot.workout
  const weekday = getDayFullLabel(slot.dayIndex)
  const metrics = useMemo(
    () => (workout ? getWorkoutDisplayMetrics(workout.intervals) : null),
    [workout]
  )

  if (!workout || !metrics) {
    return (
      <section className="py-6 sm:py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(260px,0.36fr)_minmax(0,1fr)] lg:items-center">
          <div className="space-y-5">
            <div className="text-sm font-semibold tracking-wide text-primary uppercase">
              {weekday}
            </div>
            <div>
              <h2 className="font-heading text-3xl font-medium">
                No workout assigned
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                Add a workout to build out this training day.
              </p>
            </div>
            <Button className="w-fit" onClick={onOpenPicker}>
              <Plus className="size-4" />
              Add workout
            </Button>
          </div>
          <div className="relative hidden h-48 items-end gap-1 border-b border-border/70 pb-5 sm:flex lg:h-64">
            <div className="absolute inset-x-0 top-4 border-t border-dashed border-border/55" />
            <div className="absolute inset-x-0 top-1/3 border-t border-dashed border-border/45" />
            <div className="absolute inset-x-0 top-2/3 border-t border-dashed border-border/35" />
            {[36, 58, 44, 76, 52, 68, 40, 50, 62, 46, 72, 54].map(
              (height, index) => (
                <div
                  key={index}
                  className="relative z-10 flex-1 rounded-t bg-muted-foreground/20"
                  style={{ height: `${height}%` }}
                />
              )
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="border-b border-border/60 py-6 sm:py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(260px,0.36fr)_minmax(0,1fr)] lg:items-end">
        <div className="min-w-0 space-y-7">
          <div className="min-w-0 space-y-3">
            <div className="text-sm font-semibold tracking-wide text-primary uppercase">
              {weekday}
            </div>
            <h2 className="truncate font-heading text-3xl font-medium">
              {workout.title}
            </h2>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                style={{
                  color: metrics.zoneInfo.color,
                  borderColor: metrics.zoneInfo.colorMuted,
                }}
              >
                {metrics.zoneLabel}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {metrics.zoneInfo.name}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-5">
            <Metric label="Duration" value={metrics.durationLabel} />
            <Metric label="TSS" value={String(metrics.stressScore)} />
            <Metric label="IF" value={metrics.intensityFactor.toFixed(2)} />
            <Metric
              label="Avg Power (of FTP)"
              value={`${Math.round(metrics.stats.averagePower)}%`}
            />
            <Metric label="Most Used Zone" value={metrics.zoneLabel} />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" onClick={onViewWorkoutDetails}>
              View workout details
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
            <div className="flex h-48 flex-col justify-between py-1 text-xs text-muted-foreground sm:h-56 lg:h-64">
              <span>Z5</span>
              <span>Z4</span>
              <span>Z3</span>
              <span>Z2</span>
              <span>Z1</span>
            </div>
            <div className="min-w-0">
              <div className="relative h-48 border-b border-border/70 sm:h-56 lg:h-64">
                <div className="absolute inset-x-0 top-0 border-t border-dashed border-border/55" />
                <div className="absolute inset-x-0 top-1/5 border-t border-dashed border-border/45" />
                <div className="absolute inset-x-0 top-2/5 border-t border-dashed border-border/45" />
                <div className="absolute inset-x-0 top-3/5 border-t border-dashed border-border/45" />
                <div className="absolute inset-x-0 top-4/5 border-t border-dashed border-border/45" />
                <WorkoutMini
                  intervals={workout.intervals}
                  className="absolute inset-x-0 bottom-0 h-[88%]"
                  aria-label={`${workout.title} workout preview`}
                  showFtpLine
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>0:00</span>
                <span>{metrics.durationLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onOpenPicker}>
              <RefreshCw className="size-4" />
              Swap workout
            </Button>
            <Button onClick={onRemoveWorkout}>
              <Trash2 className="size-4" />
              Remove from day
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
