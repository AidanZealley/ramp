import type React from "react"
import type {
  RideExperienceConnection,
  RideSessionController,
} from "@ramp/ride-core"

export type RideExperiencePlugin = {
  id: string
  displayName: string
  ExperienceView: React.ComponentType<{
    session: RideSessionController
    connection: RideExperienceConnection
    search?: {
      workoutId?: string
    }
  }>
}

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
