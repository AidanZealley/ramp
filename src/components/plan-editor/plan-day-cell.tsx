import { WorkoutMini } from "@/components/workout-mini"
import { cn } from "@/lib/utils"
import { formatDuration, getTotalDuration } from "@/lib/workout-utils"
import { WEEKDAY_SHORT } from "./constants"
import type { PlanEditorSlot } from "./types"

interface PlanDayCellProps {
  slot: PlanEditorSlot
  ftp: number
  onClick: () => void
}

export function PlanDayCell({ slot, ftp, onClick }: PlanDayCellProps) {
  const workout = slot.workout
  const duration = workout ? getTotalDuration(workout.intervals) : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-32 w-full rounded-lg border border-border/60 bg-background p-2 text-left transition-colors hover:border-primary/50 hover:bg-muted/30",
        !workout && "border-dashed bg-muted/20"
      )}
    >
      <div className="mb-2 text-xs font-medium text-muted-foreground md:hidden">
        {WEEKDAY_SHORT[slot.dayIndex]}
      </div>
      {workout ? (
        <div className="space-y-2">
          <WorkoutMini
            intervals={workout.intervals}
            ftp={ftp}
            powerMode={workout.powerMode}
            className="h-14 w-full rounded-md bg-muted/40"
            compact
          />
          <div className="min-w-0">
            <div className="line-clamp-2 text-sm leading-snug font-medium">
              {workout.title}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {formatDuration(duration)}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-20 items-center justify-center rounded-md border border-dashed border-border/50 text-xs text-muted-foreground">
          Rest
        </div>
      )}
    </button>
  )
}
