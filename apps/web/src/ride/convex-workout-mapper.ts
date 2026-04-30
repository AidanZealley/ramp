import type { WorkoutDefinition } from "@ramp/ride-workouts"
import type { Doc } from "#convex/_generated/dataModel"

export type ClientWorkoutDoc = Omit<Doc<"workouts">, "powerMode"> & {
  intervalsRevision: number
}

export function toWorkoutDefinition(
  doc: ClientWorkoutDoc
): WorkoutDefinition {
  return {
    id: doc._id,
    title: doc.title,
    intervals: doc.intervals,
    powerMode: "percentage",
  }
}
