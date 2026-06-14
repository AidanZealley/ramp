import { useMemo } from "react"
import { DayTssBarChart } from "./day-tss-bar-chart"
import { computeWeekTotals } from "./utils"
import type { PlanEditorWeek } from "../../types"
import { formatDuration } from "@/lib/workout-utils"

interface WeekTotalsFooterProps {
  week: PlanEditorWeek
  activeDayIndex?: number | null
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-heading text-lg font-medium">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

export function WeekTotalsFooter({
  week,
  activeDayIndex,
}: WeekTotalsFooterProps) {
  const totals = useMemo(() => computeWeekTotals(week), [week])

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/80 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-8">
        <Stat
          label="Duration"
          value={formatDuration(totals.totalDurationSeconds)}
        />
        <Stat label="TSS" value={String(Math.round(totals.totalStressScore))} />
        <Stat label="Workouts" value={String(totals.workoutCount)} />
      </div>
      <div className="w-full lg:max-w-sm">
        <DayTssBarChart
          perDayStressScore={totals.perDayStressScore}
          activeDayIndex={activeDayIndex}
        />
      </div>
    </div>
  )
}
