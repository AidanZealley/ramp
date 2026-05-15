import { DiagnosticsExperienceView } from "./diagnostics-experience-view"
import type { RideExperiencePlugin } from "@/ride/experience-runtime"

export const diagnosticsExperience: RideExperiencePlugin = {
  id: "diagnostics",
  displayName: "Diagnostics",
  privileged: true,
  ExperienceView: DiagnosticsExperienceView,
}

export { DiagnosticsExperienceView }
