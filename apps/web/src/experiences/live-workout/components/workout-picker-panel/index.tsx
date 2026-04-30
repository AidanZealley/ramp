import { Dumbbell } from "lucide-react"
import { WorkoutPickerTile } from "./components/workout-picker-tile"
import type { Id } from "#convex/_generated/dataModel"
import type { ClientWorkoutDoc } from "@/ride/convex-workout-mapper"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type WorkoutPickerPanelProps = {
  isLoading: boolean
  onSelect: (id: Id<"workouts">) => void
  selectedWorkoutId: Id<"workouts"> | null
  workouts: ReadonlyArray<ClientWorkoutDoc>
}

export function WorkoutPickerPanel({
  isLoading,
  onSelect,
  selectedWorkoutId,
  workouts,
}: WorkoutPickerPanelProps) {
  return (
    <Card
      size="sm"
      className="flex max-h-[calc(100svh-9rem)] flex-col bg-background/85 shadow-xl backdrop-blur-md"
    >
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="size-4 text-foreground/70" />
            <h2 className="font-heading text-base font-semibold tracking-tight">
              Choose a workout
            </h2>
          </div>
          <span className="text-[0.65rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            {isLoading ? "Loading" : `${workouts.length} saved`}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton
                key={index}
                className="h-24 w-full rounded-3xl bg-muted/50"
              />
            ))}
          </div>
        ) : workouts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-background/60 px-4 py-8 text-center text-sm text-muted-foreground">
            No saved workouts yet. Create one in the workout library to ride it
            here.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {workouts.map((workout) => (
              <li key={workout._id}>
                <WorkoutPickerTile
                  isSelected={workout._id === selectedWorkoutId}
                  onClick={() => onSelect(workout._id)}
                  workout={workout}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
