import { FreeRideExperienceView } from "./free-ride-experience-view"
import type { RideExperiencePlugin } from "@/ride/experience-runtime"

export const freeRideExperience: RideExperiencePlugin = {
  id: "free-ride",
  displayName: "Free Ride",
  ExperienceView: FreeRideExperienceView,
}

export { FreeRideExperienceView }
export {
  createTrackSample,
  getLowerWorldY,
  getVisualTrackY,
  offsetAlongRight,
  sampleTrack,
  sampleTrackInto,
} from "./track"
