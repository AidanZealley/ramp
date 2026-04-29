import { ArrowLeft } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "#convex/_generated/api"
import { WorkoutActionsMenu } from "./workout-actions-menu"
import type { Id } from "#convex/_generated/dataModel"
import { EditableTitle } from "@/components/editable-title"
import { Button } from "@/components/ui/button"

interface WorkoutPageHeaderProps {
  workoutId: Id<"workouts">
  title: string
  onBack: () => void
  onDuplicate: () => Promise<void>
  onDelete: () => Promise<void>
}

export function WorkoutPageHeader({
  workoutId,
  title,
  onBack,
  onDuplicate,
  onDelete,
}: WorkoutPageHeaderProps) {
  const updateTitle = useMutation(api.workouts.updateTitle)

  return (
    <div className="flex flex-col gap-3">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="size-4" />
      </Button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <EditableTitle
          value={title}
          onChange={(nextTitle) =>
            void updateTitle({ id: workoutId, title: nextTitle })
          }
        />
        <WorkoutActionsMenu
          title={title}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}
