import { countrysideExperience } from "./countryside"
import { liveWorkoutExperience } from "./live-workout"
import type { RideExperienceDefinition } from "./types"

export const rideExperiences: Array<RideExperienceDefinition> = [
  {
    id: countrysideExperience.id,
    displayName: countrysideExperience.displayName,
    description:
      "Cruise an endless countryside road with a reactive 3D world and live terrain grade.",
    tags: ["3D scenery", "free ride", "workout compatible"],
    accent: {
      from: "#d7f0c7",
      to: "#66a36f",
      ink: "#132018",
    },
    preview: {
      eyebrow: "Open roads",
      spotlight: "Reactive R3F scenery",
    },
    plugin: countrysideExperience,
  },
  {
    id: liveWorkoutExperience.id,
    displayName: liveWorkoutExperience.displayName,
    description:
      "Pick a saved workout and ride it in ERG mode against the simulated trainer.",
    tags: ["workout", "ERG", "simulator"],
    accent: {
      from: "#d8e3ff",
      to: "#3553b8",
      ink: "#0c1530",
    },
    preview: {
      eyebrow: "Structured ride",
      spotlight: "ERG-controlled intervals",
    },
    plugin: liveWorkoutExperience,
  },
]

export const experienceCatalog: Record<string, RideExperienceDefinition> =
  Object.fromEntries(
    rideExperiences.map((experience) => [experience.id, experience])
  )

export function getRideExperienceDefinition(experienceId: string) {
  return experienceCatalog[experienceId] ?? null
}
