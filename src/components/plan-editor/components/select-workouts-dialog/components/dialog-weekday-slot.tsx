import { WorkoutMini } from "@/components/workout-mini"
import { cn } from "@/lib/utils"
import { WEEKDAY_SHORT } from "../../../constants"
import type { WorkoutDoc } from "../types"

interface DialogWeekdaySlotProps {
  dayIndex: number
  workout: WorkoutDoc | null
  active: boolean
  onClick: () => void
}

export function DialogWeekdaySlot({
  dayIndex,
  workout,
  active,
  onClick,
}: DialogWeekdaySlotProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-32 rounded-lg border bg-background p-2 text-left transition-colors",
        active ? "border-primary ring-2 ring-primary/20" : "border-border/60",
        !workout && "border-dashed bg-muted/20"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {WEEKDAY_SHORT[dayIndex]}
        </span>
      </div>
      {workout ? (
        <div className="space-y-2">
          <WorkoutMini
            intervals={workout.intervals}
            className="h-12 w-full rounded-md bg-muted/40"
            compact
          />
          <div className="line-clamp-2 text-sm leading-snug font-medium">
            {workout.title}
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
