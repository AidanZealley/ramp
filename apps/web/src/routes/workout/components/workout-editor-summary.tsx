import { WorkoutSummary } from "@/components/workout-summary"
import {
  useWorkoutEditorCurrentIntervals,
  useWorkoutEditorFtp,
  useWorkoutEditorStats,
} from "@/components/workout-editor/store"

export function WorkoutEditorSummary() {
  const intervals = useWorkoutEditorCurrentIntervals()
  const stats = useWorkoutEditorStats()
  const ftp = useWorkoutEditorFtp()

  if (intervals.length === 0) {
    return null
  }

  return <WorkoutSummary stats={stats} ftp={ftp} />
}
