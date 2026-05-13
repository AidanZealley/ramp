import { DiagnosticsExperienceView } from "./diagnostics-experience-view"
import type { RideExperiencePlugin } from "@/experiences/types"

export const diagnosticsExperience: RideExperiencePlugin = {
  id: "diagnostics",
  displayName: "Diagnostics",
  ExperienceView: DiagnosticsExperienceView,
}

export { DiagnosticsExperienceView }
