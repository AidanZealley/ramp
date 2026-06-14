import { DayCard } from "./day-card"
import { WeekNav } from "./week-nav"
import { WeekTotalsFooter } from "./week-totals-footer"
import { getDaySlots } from "./utils"
import type { PlanEditorWeek } from "../../types"

interface WeekViewProps {
  week: PlanEditorWeek
  weekNumber: number
  totalWeeks: number
  activeDayIndex: number | null
  onSelectDay: (dayIndex: number) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  onAddWeek: () => void
  onDeleteWeek: () => void
}

export function WeekView({
  week,
  weekNumber,
  totalWeeks,
  activeDayIndex,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
  onAddWeek,
  onDeleteWeek,
}: WeekViewProps) {
  const daySlots = getDaySlots(week)

  return (
    <div className="space-y-4">
      <WeekNav
        weekNumber={weekNumber}
        totalWeeks={totalWeeks}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
        onAddWeek={onAddWeek}
        onDeleteWeek={onDeleteWeek}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
        {daySlots.map((slot) => (
          <DayCard
            key={slot.dayIndex}
            slot={slot}
            active={activeDayIndex === slot.dayIndex}
            onClick={() => onSelectDay(slot.dayIndex)}
          />
        ))}
      </div>

      <WeekTotalsFooter week={week} activeDayIndex={activeDayIndex} />
    </div>
  )
}
