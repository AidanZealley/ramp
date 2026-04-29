import type { WorkoutDefinition } from "@ramp/ride-workouts"

type ConvexWorkoutLike = {
  _id: string
  title: string
  intervals: WorkoutDefinition["intervals"]
  powerMode?: "percentage" | "absolute"
}

export function toWorkoutDefinition(
  doc: ConvexWorkoutLike
): WorkoutDefinition {
  return {
    id: doc._id,
    title: doc.title,
    intervals: doc.intervals,
    powerMode: doc.powerMode ?? "percentage",
  }
}
