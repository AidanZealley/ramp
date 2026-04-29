import { WorkoutSummary } from "@/components/workout-summary"
import {
  useWorkoutEditorCurrentIntervals,
  useWorkoutEditorStats,
} from "@/components/workout-editor/store"

export function WorkoutEditorSummary() {
  const intervals = useWorkoutEditorCurrentIntervals()
  const stats = useWorkoutEditorStats()

  if (intervals.length === 0) {
    return null
  }

  return <WorkoutSummary stats={stats} />
}
