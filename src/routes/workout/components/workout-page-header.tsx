import { ArrowLeft } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"
import { EditableTitle } from "@/components/editable-title"
import { Button } from "@/components/ui/button"

interface WorkoutPageHeaderProps {
  workoutId: Id<"workouts">
  title: string
  onBack: () => void
}

export function WorkoutPageHeader({
  workoutId,
  title,
  onBack,
}: WorkoutPageHeaderProps) {
  const updateTitle = useMutation(api.workouts.updateTitle)

  return (
    <div className="flex flex-col gap-3">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="size-4" />
      </Button>
      <div>
        <EditableTitle
          value={title}
          onChange={(nextTitle) => void updateTitle({ id: workoutId, title: nextTitle })}
        />
      </div>
    </div>
  )
}
