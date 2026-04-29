import { Plus } from "lucide-react"
import { WorkoutEditor } from "@/components/workout-editor"
import { Button } from "@/components/ui/button"
import type { Interval, PowerDisplayMode } from "@/lib/workout-utils"

interface WorkoutPageEditorSectionProps {
  intervals: Interval[]
  displayMode: PowerDisplayMode
  ftp: number
  onIntervalsChange: (intervals: Interval[]) => void
  onRegisterInsertAction: (insertAction: (() => void) | null) => void
  onEmptyStateAddInterval: () => void
}

export function WorkoutPageEditorSection({
  intervals,
  displayMode,
  ftp,
  onIntervalsChange,
  onRegisterInsertAction,
  onEmptyStateAddInterval,
}: WorkoutPageEditorSectionProps) {
  if (intervals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No intervals yet. Add one to get started.
        </p>
        <Button variant="outline" size="sm" onClick={onEmptyStateAddInterval}>
          <Plus className="size-4" />
          Add Interval
        </Button>
      </div>
    )
  }

  return (
    <WorkoutEditor
      intervals={intervals}
      displayMode={displayMode}
      ftp={ftp}
      onIntervalsChange={onIntervalsChange}
      onInsertActionReady={onRegisterInsertAction}
    />
  )
}
