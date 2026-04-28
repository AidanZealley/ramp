import { Button } from "@/components/ui/button"
import type { PowerDisplayMode } from "@/lib/workout-utils"
import type { WorkoutDoc } from "../types"
import { DialogWorkoutTile } from "./dialog-workout-tile"

interface DialogWorkoutGridProps {
  workouts: WorkoutDoc[]
  ftp: number
  displayMode: PowerDisplayMode
  onWorkoutSelect: (workout: WorkoutDoc) => void
  onClearFilters: () => void
}

export function DialogWorkoutGrid({
  workouts,
  ftp,
  displayMode,
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
          ftp={ftp}
          displayMode={displayMode}
          onClick={() => onWorkoutSelect(workout)}
        />
      ))}
    </div>
  )
}
