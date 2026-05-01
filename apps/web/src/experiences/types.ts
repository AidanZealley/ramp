import type { RideExperiencePlugin } from "@ramp/ride-core"

export type RideExperienceDefinition = {
  id: string
  displayName: string
  description: string
  tags: Array<string>
  accent: {
    from: string
    to: string
    ink: string
  }
  preview: {
    eyebrow: string
    spotlight: string
  }
  loadPlugin: () => Promise<RideExperiencePlugin>
}
