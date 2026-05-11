import { WorkoutMini } from "@/components/workout-mini"
import type { Interval } from "@/lib/workout-utils"

type WorkoutProgressOverviewProps = {
  intervals: Array<Interval>
  overallProgressPercent: number
  completedIntervalCount: number
}

export const WorkoutProgressOverview = ({
  intervals,
  overallProgressPercent,
  completedIntervalCount,
}: WorkoutProgressOverviewProps) => {
  const progress = Math.max(0, Math.min(100, overallProgressPercent))

  return (
    <section className="min-w-0" aria-label="Workout overview">
      <div className="mb-2 flex items-center justify-between gap-3 text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        <span>Workout overview</span>
        <span>
          {completedIntervalCount}/{intervals.length} intervals completed
        </span>
      </div>
      <div className="relative h-28 overflow-hidden md:h-36 xl:h-44">
        <WorkoutMini
          intervals={intervals}
          className="h-full"
          aria-label="Workout interval shape"
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-[color-mix(in_oklch,var(--primary)_18%,transparent)]"
          style={{ width: `${progress}%` }}
        />
        <div
          aria-hidden="true"
          data-testid="workout-progress-line"
          className="absolute inset-y-0 w-px bg-primary md:w-0.5"
          style={{ left: `${progress}%` }}
        />
      </div>
    </section>
  )
}
