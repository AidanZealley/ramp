import { countrysideExperience } from "./countryside"
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
]

export const experienceCatalog: Record<string, RideExperienceDefinition> =
  Object.fromEntries(
    rideExperiences.map((experience) => [experience.id, experience])
  )

export function getRideExperienceDefinition(experienceId: string) {
  return experienceCatalog[experienceId] ?? null
}
