import type {
  RideConnectionResult,
  RideSessionController,
} from "@ramp/ride-core"
import type { TrainerError } from "@ramp/trainer-io"
import type React from "react"

export type RideExperienceConnection = {
  status: "disconnected" | "connecting" | "connected" | "error"
  reconnect: () => Promise<RideConnectionResult>
  disconnect: () => Promise<void>
  error: TrainerError | null
}

export type RideExperiencePlugin = {
  id: string
  displayName: string
  ExperienceView: React.ComponentType<{
    session: RideSessionController
    connection?: RideExperienceConnection
    search?: {
      workoutId?: string
    }
  }>
}
