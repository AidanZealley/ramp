import { DrawerResultRow } from "./drawer-result-row"
import type { WorkoutDoc } from "./types"
import type { Id } from "#convex/_generated/dataModel"
import { cn } from "@/lib/utils"

interface DrawerResultsListProps {
  workouts: Array<WorkoutDoc>
  totalCount: number
  onSelect: (workoutId: Id<"workouts">) => void
  className?: string
}

export function DrawerResultsList({
  workouts,
  totalCount,
  onSelect,
  className,
}: DrawerResultsListProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="mb-2 text-xs text-muted-foreground">
        Showing {workouts.length} of {totalCount}
      </div>

      {workouts.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          No workouts match your filters.
        </div>
      ) : (
        <div className="space-y-1">
          {workouts.map((workout) => (
            <DrawerResultRow
              key={workout._id}
              workout={workout}
              onSelect={() => onSelect(workout._id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
