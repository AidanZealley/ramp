import { DAYS_PER_WEEK, WEEKDAY_SHORT } from "../../constants"
import { cn } from "@/lib/utils"

interface DayTssBarChartProps {
  perDayStressScore: Array<number>
  activeDayIndex?: number | null
}

export function DayTssBarChart({
  perDayStressScore,
  activeDayIndex,
}: DayTssBarChartProps) {
  const maxStressScore = Math.max(1, ...perDayStressScore)

  return (
    <div className="flex items-end gap-1.5">
      {Array.from({ length: DAYS_PER_WEEK }, (_, dayIndex) => {
        const stressScore = perDayStressScore[dayIndex] ?? 0
        const heightPercent =
          stressScore > 0 ? Math.max(6, (stressScore / maxStressScore) * 100) : 0

        return (
          <div
            key={dayIndex}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <div className="flex h-12 w-full items-end">
              <div
                className={cn(
                  "w-full rounded-sm bg-primary/60 transition-[height]",
                  activeDayIndex === dayIndex && "bg-primary"
                )}
                style={{ height: `${heightPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {WEEKDAY_SHORT[dayIndex]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
