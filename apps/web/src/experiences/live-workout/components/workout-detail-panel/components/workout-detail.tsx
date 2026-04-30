import { Clock3, Flame, ListOrdered, Zap } from "lucide-react"
import type React from "react"
import type { ClientWorkoutDoc } from "@/ride/convex-workout-mapper"
import { WorkoutMini } from "@/components/workout-mini"
import {
  formatDuration,
  getTotalDuration,
  percentageToWatts,
} from "@/lib/workout-utils"

export function WorkoutDetail({
  ftp,
  workout,
}: {
  ftp: number
  workout: ClientWorkoutDoc
}) {
  const totalSeconds =
    workout.summary?.totalDurationSeconds ?? getTotalDuration(workout.intervals)
  const stressScore = workout.summary
    ? Math.round(workout.summary.stressScore)
    : null
  const intervalCount = workout.intervals.length

  const peakPowerPercent = workout.intervals.reduce(
    (max, interval) => Math.max(max, interval.startPower, interval.endPower),
    0
  )
  const peakPowerWatts = percentageToWatts(peakPowerPercent, ftp)

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden">
      <div>
        <h3 className="font-heading text-lg leading-tight font-semibold">
          {workout.title}
        </h3>
      </div>

      <div className="rounded-3xl border bg-background/60 px-3 pt-3">
        <WorkoutMini intervals={workout.intervals} className="h-20" />
      </div>

      <ul className="grid grid-cols-2 gap-2 text-sm">
        <DetailItem icon={<Clock3 className="size-4" />} label="Duration">
          {formatDuration(totalSeconds)}
        </DetailItem>
        <DetailItem icon={<ListOrdered className="size-4" />} label="Intervals">
          {intervalCount}
        </DetailItem>
        <DetailItem icon={<Zap className="size-4" />} label="Peak target">
          {peakPowerWatts} W
        </DetailItem>
        {stressScore !== null && (
          <DetailItem icon={<Flame className="size-4" />} label="Stress score">
            {stressScore}
          </DetailItem>
        )}
      </ul>
    </div>
  )
}

function DetailItem({
  children,
  icon,
  label,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  label: string
}) {
  return (
    <li className="flex items-center gap-2 rounded-2xl border border-border/50 bg-background/60 px-3 py-2">
      <span className="text-foreground/70">{icon}</span>
      <div className="flex min-w-0 flex-col">
        <span className="text-[0.6rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </span>
        <span className="truncate text-sm font-medium text-foreground">
          {children}
        </span>
      </div>
    </li>
  )
}
