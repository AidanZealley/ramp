import { createContext } from "react"
import type { createWorkoutEditorStore } from "./create-store"

export const WorkoutEditorStoreContext = createContext<
  ReturnType<typeof createWorkoutEditorStore> | null
>(null)
