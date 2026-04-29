import { CalendarPlus, Trash2 } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { formatDuration, getTotalDuration } from "@/lib/workout-utils"
import { PlanDayCell } from "./plan-day-cell"
import type { PlanEditorWeek } from "../types"

interface PlanWeekRowProps {
  week: PlanEditorWeek
  weekNumber: number
  onSelectWeek: (week: PlanEditorWeek) => void
  onSelectDay: (week: PlanEditorWeek, dayIndex: number) => void
  onDeleteWeek: (weekId: Id<"planWeeks">) => void
}

export function PlanWeekRow({
  week,
  weekNumber,
  onSelectWeek,
  onSelectDay,
  onDeleteWeek,
}: PlanWeekRowProps) {
  const assignedSlots = week.slots.filter((slot) => slot.workout)
  const totalDuration = assignedSlots.reduce(
    (sum, slot) =>
      sum + (slot.workout ? getTotalDuration(slot.workout.intervals) : 0),
    0
  )

  return (
    <div className="grid min-w-248 grid-cols-[12rem_repeat(7,minmax(7rem,1fr))] gap-3 border-b border-border/60 py-3 last:border-b-0">
      <div className="space-y-3 rounded-lg bg-muted/25 p-3">
        <div>
          <div className="font-heading text-lg font-medium">
            Week {weekNumber}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {assignedSlots.length} workout
            {assignedSlots.length === 1 ? "" : "s"}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDuration(totalDuration)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onSelectWeek(week)}
          >
            <CalendarPlus className="size-4" />
            Select Workouts
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete Week ${weekNumber}`}
            onClick={() => onDeleteWeek(week._id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {week.slots.map((slot) => (
        <PlanDayCell
          key={slot._id}
          slot={slot}
          onClick={() => onSelectDay(week, slot.dayIndex)}
        />
      ))}
    </div>
  )
}
