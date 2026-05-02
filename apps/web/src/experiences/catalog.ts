import type { RideExperienceDefinition } from "./types"

export const rideExperiences: Array<RideExperienceDefinition> = [
  {
    id: "countryside-r3f",
    displayName: "Countryside",
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
    loadPlugin: async () =>
      (await import("./countryside")).countrysideExperience,
  },
  {
    id: "live-workout",
    displayName: "Live Workout",
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
    loadPlugin: async () =>
      (await import("./live-workout")).liveWorkoutExperience,
  },
  {
    id: "diagnostics",
    displayName: "Diagnostics",
    description:
      "Raw trainer telemetry display and manual command controls for testing.",
    tags: ["debug", "testing"],
    accent: {
      from: "#e2e2e2",
      to: "#6b7280",
      ink: "#111827",
    },
    preview: {
      eyebrow: "Developer tools",
      spotlight: "Raw data + manual control",
    },
    loadPlugin: async () =>
      (await import("./diagnostics")).diagnosticsExperience,
  },
]

export const experienceCatalog: Record<string, RideExperienceDefinition> =
  Object.fromEntries(
    rideExperiences.map((experience) => [experience.id, experience])
  )

export function getRideExperienceDefinition(experienceId: string) {
  return experienceCatalog[experienceId] ?? null
}
