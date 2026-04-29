import { Download, Plus, RefreshCw, Save, Trash2 } from "lucide-react"
import type { Interval, PowerDisplayMode } from "@/lib/workout-utils"
import { Button } from "@/components/ui/button"
import {
  useWorkoutEditorActions,
  useWorkoutEditorBaselineRevision,
  useWorkoutEditorCanRevert,
  useWorkoutEditorCurrentIntervals,
  useWorkoutEditorHasIncomingServerChanges,
  useWorkoutEditorIsDirty,
} from "@/components/workout-editor/store"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface WorkoutPageControlsProps {
  displayMode: PowerDisplayMode
  onDisplayModeChange: (mode: PowerDisplayMode) => void | Promise<void>
  onExport: (intervals: Array<Interval>) => void
  onSave: (args: {
    intervals: Array<Interval>
    expectedIntervalsRevision: number
    hasIncomingServerChanges: boolean
  }) => void | Promise<void>
  onDelete: () => void
}

export function WorkoutPageControls({
  displayMode,
  onDisplayModeChange,
  onExport,
  onSave,
  onDelete,
}: WorkoutPageControlsProps) {
  const intervals = useWorkoutEditorCurrentIntervals()
  const baselineRevision = useWorkoutEditorBaselineRevision()
  const isDirty = useWorkoutEditorIsDirty()
  const canRevert = useWorkoutEditorCanRevert()
  const hasIncomingServerChanges = useWorkoutEditorHasIncomingServerChanges()
  const actions = useWorkoutEditorActions()
  const canExport = intervals.length > 0

  return (
    <div className="flex flex-wrap items-center gap-3">
      <ToggleGroup
        variant="outline"
        value={[displayMode]}
        onValueChange={(values) => {
          const nextValue = values[0]
          if (nextValue === "absolute" || nextValue === "percentage") {
            void onDisplayModeChange(nextValue)
          }
        }}
      >
        <ToggleGroupItem value="absolute">Watts</ToggleGroupItem>
        <ToggleGroupItem value="percentage">% FTP</ToggleGroupItem>
      </ToggleGroup>

      <div className="mx-1 h-5 w-px bg-border" />

      <Button
        variant="outline"
        onClick={actions.insertAfterSelectionOrAppend}
        data-editor-action
      >
        <Plus className="size-4" />
        Add Interval
      </Button>

      <Button
        variant="outline"
        onClick={() => onExport(intervals)}
        disabled={!canExport}
      >
        <Download className="size-4" />
        Export .mrc
      </Button>

      <div className="flex-1" />

      {isDirty && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={actions.resetToBaseline}
            disabled={!canRevert}
          >
            <RefreshCw className="size-4" />
            Revert
          </Button>
          <Button
            size="sm"
            onClick={() =>
              void onSave({
                intervals,
                expectedIntervalsRevision: baselineRevision,
                hasIncomingServerChanges,
              })
            }
          >
            <Save className="size-4" />
            Save Changes
          </Button>
        </>
      )}

      <Button variant="destructive" onClick={onDelete}>
        <Trash2 className="size-4" />
        Delete
      </Button>
    </div>
  )
}
