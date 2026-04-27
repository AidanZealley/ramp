import { WorkoutMini } from "@/components/workout-mini"
import { Badge } from "@/components/ui/badge"
import { formatDuration, getTotalDuration } from "@/lib/workout-utils"
import type { WorkoutDoc } from "../types"

interface DialogWorkoutTileProps {
  workout: WorkoutDoc
  ftp: number
  onClick: () => void
}

export function DialogWorkoutTile({
  workout,
  ftp,
  onClick,
}: DialogWorkoutTileProps) {
  const duration = getTotalDuration(workout.intervals)

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-border/60 bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/30"
    >
      <WorkoutMini
        intervals={workout.intervals}
        ftp={ftp}
        powerMode={workout.powerMode}
        className="h-16 w-full rounded-md bg-muted/40"
        compact
      />
      <div className="mt-3 line-clamp-2 text-sm leading-snug font-medium">
        {workout.title}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{formatDuration(duration)}</span>
        <Badge variant="outline">
          {workout.powerMode === "absolute" ? "Absolute" : "Percentage"}
        </Badge>
      </div>
    </button>
  )
}
