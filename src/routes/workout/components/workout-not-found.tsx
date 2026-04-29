import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WorkoutNotFoundProps {
  onBack: () => void
}

export function WorkoutNotFound({ onBack }: WorkoutNotFoundProps) {
  return (
    <div className="space-y-4 py-20 text-center">
      <h2 className="font-heading text-xl font-medium">Workout not found</h2>
      <p className="text-sm text-muted-foreground">
        This workout may have been deleted.
      </p>
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="size-4" />
        Back to Workouts
      </Button>
    </div>
  )
}
