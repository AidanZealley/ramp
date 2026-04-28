import type { Doc } from "../../../../../convex/_generated/dataModel"

export type WorkoutDoc = Doc<"workouts">

export type DurationFilter = "any" | "short" | "medium" | "long"
export type SortOption = "recent" | "title" | "duration-asc" | "duration-desc"

export const sortLabels: Record<SortOption, string> = {
  recent: "Recent",
  title: "Title A-Z",
  "duration-asc": "Duration up",
  "duration-desc": "Duration down",
}
