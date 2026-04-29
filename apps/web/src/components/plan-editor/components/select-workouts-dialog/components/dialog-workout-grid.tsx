import { DialogWorkoutTile } from "./dialog-workout-tile"
import type { WorkoutDoc } from "../types"
import { Button } from "@/components/ui/button"

interface DialogWorkoutGridProps {
  workouts: Array<WorkoutDoc>
  onWorkoutSelect: (workout: WorkoutDoc) => void
  onClearFilters: () => void
}

export function DialogWorkoutGrid({
  workouts,
  onWorkoutSelect,
  onClearFilters,
}: DialogWorkoutGridProps) {
  if (workouts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 px-6 py-12 text-center">
        <p className="font-medium">No workouts match your filters</p>
        <Button variant="outline" className="mt-4" onClick={onClearFilters}>
          Clear filters
        </Button>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {workouts.map((workout) => (
        <DialogWorkoutTile
          key={workout._id}
          workout={workout}
          onClick={() => onWorkoutSelect(workout)}
        />
      ))}
    </div>
  )
}
