import type { Id } from "../../../convex/_generated/dataModel"
import type { PowerDisplayMode } from "@/lib/workout-utils"
import { WEEKDAYS } from "./constants"
import { PlanWeekRow } from "./plan-week-row"
import type { PlanEditorWeek } from "./types"

interface PlanScheduleGridProps {
  weeks: PlanEditorWeek[]
  ftp: number
  displayMode: PowerDisplayMode
  onSelectWeek: (week: PlanEditorWeek) => void
  onSelectDay: (week: PlanEditorWeek, dayIndex: number) => void
  onDeleteWeek: (weekId: Id<"planWeeks">) => void
}

export function PlanScheduleGrid({
  weeks,
  ftp,
  displayMode,
  onSelectWeek,
  onSelectDay,
  onDeleteWeek,
}: PlanScheduleGridProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60 bg-card/80">
      <div className="min-w-[62rem]">
        <div className="sticky top-0 z-10 grid grid-cols-[12rem_repeat(7,minmax(7rem,1fr))] gap-3 border-b border-border/60 bg-card/95 px-0 py-3 backdrop-blur">
          <div className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Week
          </div>
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="px-3">
          {weeks.map((week, index) => (
            <PlanWeekRow
              key={week._id}
              week={week}
              weekNumber={index + 1}
              ftp={ftp}
              displayMode={displayMode}
              onSelectWeek={onSelectWeek}
              onSelectDay={onSelectDay}
              onDeleteWeek={onDeleteWeek}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
