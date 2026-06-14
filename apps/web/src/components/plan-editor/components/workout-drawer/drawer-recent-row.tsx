import type { WorkoutDoc } from "./types"
import type { Id } from "#convex/_generated/dataModel"
import { WorkoutMini } from "@/components/workout-mini"

interface DrawerRecentRowProps {
  workouts: Array<WorkoutDoc>
  onSelect: (workoutId: Id<"workouts">) => void
}

export function DrawerRecentRow({ workouts, onSelect }: DrawerRecentRowProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">Recent</div>
      <div className="grid grid-cols-3 gap-2">
        {workouts.map((workout) => (
          <button
            key={workout._id}
            type="button"
            onClick={() => onSelect(workout._id)}
            className="rounded-lg border border-border/60 p-2 text-left transition-colors hover:border-primary/50 hover:bg-muted/30"
          >
            <WorkoutMini
              intervals={workout.intervals}
              className="h-8 w-full rounded bg-muted/40"
              compact
            />
            <div className="mt-1 truncate text-xs font-medium">
              {workout.title}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
