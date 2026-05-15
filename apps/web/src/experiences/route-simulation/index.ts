import { RouteSimulationExperienceView } from "./route-simulation-experience-view"
import type { RideExperiencePlugin } from "@/ride/experience-runtime"

export const routeSimulationExperience: RideExperiencePlugin = {
  id: "route",
  displayName: "Route Simulation",
  ExperienceView: RouteSimulationExperienceView,
}
