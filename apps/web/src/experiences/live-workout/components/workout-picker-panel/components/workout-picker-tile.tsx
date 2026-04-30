import { Clock3, Flame } from "lucide-react"
import type { ClientWorkoutDoc } from "@/ride/convex-workout-mapper"
import { WorkoutMini } from "@/components/workout-mini"
import { cn } from "@/lib/utils"
import { formatDuration } from "@/lib/workout-utils"

export function WorkoutPickerTile({
  isSelected,
  onClick,
  workout,
}: {
  isSelected: boolean
  onClick: () => void
  workout: ClientWorkoutDoc
}) {
  const roundedStressScore =
    workout.summary === undefined
      ? null
      : Math.round(workout.summary.stressScore)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        "group flex w-full flex-col gap-2 rounded-3xl border border-border/60 bg-card/80 p-3 text-left transition-all",
        "hover:border-primary/40 hover:shadow-md focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
        isSelected &&
          "border-primary/70 bg-card shadow-lg ring-2 ring-primary/30"
      )}
    >
      <WorkoutMini intervals={workout.intervals} className="h-12" compact />
      <div className="flex flex-col gap-1">
        <h3 className="line-clamp-1 font-heading text-sm leading-tight font-medium">
          {workout.title}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock3 className="size-3 text-foreground/70" />
            {formatDuration(workout.summary?.totalDurationSeconds ?? 0)}
          </span>
          {roundedStressScore !== null && (
            <span className="flex items-center gap-1">
              <Flame className="size-3 text-foreground/70" />
              {roundedStressScore} TSS
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
