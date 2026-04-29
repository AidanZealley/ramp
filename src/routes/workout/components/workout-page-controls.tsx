import { Download, Plus, RefreshCw, Save, Trash2 } from "lucide-react"
import type { PowerDisplayMode } from "@/lib/workout-utils"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface WorkoutPageControlsProps {
  displayMode: PowerDisplayMode
  onDisplayModeChange: (mode: PowerDisplayMode) => void | Promise<void>
  onAddInterval: () => void
  onExport: () => void
  canExport: boolean
  isDirty: boolean
  onRevert: () => void
  onSave: () => void | Promise<void>
  onDelete: () => void
}

export function WorkoutPageControls({
  displayMode,
  onDisplayModeChange,
  onAddInterval,
  onExport,
  canExport,
  isDirty,
  onRevert,
  onSave,
  onDelete,
}: WorkoutPageControlsProps) {
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

      <Button variant="outline" onClick={onAddInterval} data-editor-action>
        <Plus className="size-4" />
        Add Interval
      </Button>

      <Button variant="outline" onClick={onExport} disabled={!canExport}>
        <Download className="size-4" />
        Export .mrc
      </Button>

      <div className="flex-1" />

      {isDirty && (
        <>
          <Button variant="outline" size="sm" onClick={onRevert}>
            <RefreshCw className="size-4" />
            Revert
          </Button>
          <Button size="sm" onClick={() => void onSave()}>
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
