import { FreeRideExperienceView } from "./free-ride-experience-view"
import type { RideExperiencePlugin } from "@/ride/experience-runtime"

export const freeRideExperience: RideExperiencePlugin = {
  id: "free-ride",
  displayName: "Free Ride",
  ExperienceView: FreeRideExperienceView,
}

export { FreeRideExperienceView }
export { getLowerWorldY, getVisualTrackY, offsetAlongRight, sampleTrack } from "./track"
