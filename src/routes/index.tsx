import { createFileRoute } from "@tanstack/react-router"
import { WorkoutLibrary } from "@/components/workout-library"

export const Route = createFileRoute("/")({
  component: WorkoutLibrary,
})
