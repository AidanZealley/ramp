import { Clock3, Flame } from "lucide-react"
import type { Doc } from "#convex/_generated/dataModel"
import { WorkoutMini } from "@/components/workout-mini"
import { Card, CardContent } from "@/components/ui/card"
import { formatDuration } from "@/lib/workout-utils"

interface WorkoutLibraryTileProps {
  workout: Doc<"workouts">
  onClick: () => void
}

export function WorkoutLibraryTile({
  workout,
  onClick,
}: WorkoutLibraryTileProps) {
  const roundedStressScore =
    workout.summary === undefined
      ? null
      : Math.round(workout.summary.stressScore)

  return (
    <Card
      size="sm"
      className="group cursor-pointer py-0! transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/20"
      onClick={onClick}
    >
      <CardContent className="flex flex-col gap-3 px-0!">
        <div className="border-b bg-background/50 px-3 pt-3">
          <WorkoutMini intervals={workout.intervals} className="h-16" />
        </div>
        <div className="px-3 pb-3">
          <h3 className="font-heading text-sm leading-tight font-medium">
            {workout.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock3 className="size-3.5 text-foreground/70" />
              <span>
                {formatDuration(workout.summary?.totalDurationSeconds ?? 0)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="size-3.5 text-foreground/70" />
              <span>
                {roundedStressScore === null
                  ? "Calculating"
                  : `${roundedStressScore} stress points`}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
