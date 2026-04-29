import { Plus } from "lucide-react"
import { WorkoutEditor } from "@/components/workout-editor"
import {
  useWorkoutEditorActions,
  useWorkoutEditorCurrentIntervals,
} from "@/components/workout-editor/store"
import { Button } from "@/components/ui/button"

export function WorkoutPageEditorSection() {
  const intervals = useWorkoutEditorCurrentIntervals()
  const actions = useWorkoutEditorActions()

  if (intervals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No intervals yet. Add one to get started.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={actions.insertAfterSelectionOrAppend}
        >
          <Plus className="size-4" />
          Add Interval
        </Button>
      </div>
    )
  }

  return <WorkoutEditor />
}
