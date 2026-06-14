import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WeekNavProps {
  weekNumber: number
  totalWeeks: number
  onPrevWeek: () => void
  onNextWeek: () => void
  onAddWeek: () => void
  onDeleteWeek: () => void
}

export function WeekNav({
  weekNumber,
  totalWeeks,
  onPrevWeek,
  onNextWeek,
  onAddWeek,
  onDeleteWeek,
}: WeekNavProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous week"
          disabled={weekNumber <= 1}
          onClick={onPrevWeek}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next week"
          disabled={weekNumber >= totalWeeks}
          onClick={onNextWeek}
        >
          <ChevronRight className="size-4" />
        </Button>
        <div className="ml-1 flex items-baseline gap-1.5">
          <span className="font-heading text-lg font-medium">
            Week {weekNumber}
          </span>
          <span className="text-sm text-muted-foreground">of {totalWeeks}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete Week ${weekNumber}`}
          disabled={totalWeeks <= 1}
          onClick={onDeleteWeek}
        >
          <Trash2 className="size-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onAddWeek}>
          <Plus className="size-4" />
          Add week
        </Button>
      </div>
    </div>
  )
}
