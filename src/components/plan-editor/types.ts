import type { Doc } from "../../../convex/_generated/dataModel"

export type PlanEditorSlot = Omit<Doc<"planWeekWorkouts">, "dayIndex"> & {
  dayIndex: number
  workout: Doc<"workouts"> | null
}

export type PlanEditorWeek = Doc<"planWeeks"> & {
  slots: Array<PlanEditorSlot>
}

export type PlanEditorPlan = Doc<"plans"> & {
  weeks: Array<PlanEditorWeek>
}
