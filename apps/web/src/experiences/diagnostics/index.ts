import { DiagnosticsExperienceView } from "./diagnostics-experience-view"
import type { RideExperiencePlugin } from "@ramp/ride-core"

export const diagnosticsExperience: RideExperiencePlugin = {
  id: "diagnostics",
  displayName: "Diagnostics",
  ExperienceView: DiagnosticsExperienceView,
}

export { DiagnosticsExperienceView }
