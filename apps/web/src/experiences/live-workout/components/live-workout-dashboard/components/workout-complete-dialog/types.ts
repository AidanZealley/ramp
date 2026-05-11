import type { Id } from "#convex/_generated/dataModel"

export type WorkoutCompletionSummary = {
  durationSeconds: number
  distanceMeters: number
}

export type WorkoutCompleteDialogProps = {
  open: boolean
  workoutId: Id<"workouts">
  workoutTitle: string
  summary: WorkoutCompletionSummary
  onOpenChange: (open: boolean) => void
}
