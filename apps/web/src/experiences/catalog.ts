import type { RideExperienceDefinition } from "./types"

export const rideExperiences: Array<RideExperienceDefinition> = [
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
    id: "ramp-test",
    displayName: "Ramp Test",
    description:
      "Find your FTP with a Zwift-style ramp: 1-minute steps until you can no longer hold the target.",
    tags: ["FTP test", "ERG", "simulator"],
    accent: {
      from: "#ffe2d8",
      to: "#b83535",
      ink: "#30100c",
    },
    preview: {
      eyebrow: "FTP test",
      spotlight: "Progressive ramp to failure",
    },
    loadPlugin: async () => (await import("./ramp-test")).rampTestExperience,
  },
  {
    id: "route",
    displayName: "Route Simulation",
    description:
      "Ride saved GPX routes with map progress and trainer simulation grade.",
    tags: ["route", "GPX", "simulation"],
    accent: {
      from: "#cfeee5",
      to: "#287c72",
      ink: "#0b221f",
    },
    preview: {
      eyebrow: "GPX simulation",
      spotlight: "Map-based route ride",
    },
    loadPlugin: async () =>
      (await import("./route-simulation")).routeSimulationExperience,
  },
  {
    id: "free-ride",
    displayName: "Free Ride",
    description:
      "A first-person flight down a glowing anti-gravity track. Pure ride-for-the-vibe — banking neon turns, no targets.",
    tags: ["3D", "free ride", "visual"],
    accent: {
      from: "#1a0b3a",
      to: "#ff2bd6",
      ink: "#f3e9ff",
    },
    preview: {
      eyebrow: "Neon flight",
      spotlight: "Redout-style 3D world",
    },
    loadPlugin: async () => (await import("./free-ride")).freeRideExperience,
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
  return (
    rideExperiences.find((experience) => experience.id === experienceId) ?? null
  )
}
