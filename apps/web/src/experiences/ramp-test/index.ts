import { RampTestExperienceView } from "./ramp-test-experience-view"
import type { RideExperiencePlugin } from "@/ride/experience-runtime"

export const rampTestExperience: RideExperiencePlugin = {
  id: "ramp-test",
  displayName: "Ramp Test",
  ExperienceView: RampTestExperienceView,
}

export { RampTestExperienceView }
