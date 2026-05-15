import { LiveWorkoutExperienceView } from "./live-workout-experience-view"
import type { RideExperiencePlugin } from "@/ride/experience-runtime"

export const liveWorkoutExperience: RideExperiencePlugin = {
  id: "live-workout",
  displayName: "Live Workout",
  ExperienceView: LiveWorkoutExperienceView,
}

export { LiveWorkoutExperienceView }
