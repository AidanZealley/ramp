import { Clock3, Flame } from "lucide-react"

import { formatDuration, type WorkoutStats } from "@/lib/workout-utils"
import { WorkoutZoneChart } from "@/components/workout-zone-chart"

interface WorkoutSummaryProps {
  stats: WorkoutStats
}

function formatZoneDuration(seconds: number): string {
  if (seconds <= 0) return "-"

  const roundedMinutes = Math.max(1, Math.round(seconds / 60))
  const hours = Math.floor(roundedMinutes / 60)
  const minutes = roundedMinutes % 60

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h`
  }

  return `${minutes}m`
}

export function WorkoutSummary({ stats }: WorkoutSummaryProps) {
  const roundedStressScore = Math.round(stats.stressScore)

  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/50 px-5 py-4">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-3">
          <h2 className="font-heading text-base font-medium">
            Workout overview
          </h2>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <Clock3 className="size-4 text-foreground/70" />
              <span className="font-medium text-foreground">Duration:</span>
              <span>{formatDuration(stats.totalDurationSeconds)}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Flame className="size-4 text-foreground/70" />
              <span className="font-medium text-foreground">
                Stress points:
              </span>
              <span>{roundedStressScore}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-heading text-base font-medium">
            Zone distribution
          </h2>

          <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-sm text-muted-foreground sm:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((zone) => (
              <div key={zone} className="flex items-baseline gap-1.5">
                <span className="font-medium text-foreground">{`Z${zone}:`}</span>
                <span>
                  {formatZoneDuration(
                    stats.zoneDurations[zone as 1 | 2 | 3 | 4 | 5 | 6]
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 md:col-span-2 xl:col-span-1">
          <h2 className="font-heading text-base font-medium">Zones chart</h2>

          <WorkoutZoneChart zonePercentages={stats.zonePercentages} />
        </div>
      </div>
    </div>
  )
}
