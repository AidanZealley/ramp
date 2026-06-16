import type {
  RideConnectionResult,
  RideSessionController,
} from "@ramp/ride-core"
import type { TrainerError } from "@ramp/trainer-io"
import type { ActivityExperienceAPI } from "@/components/activity/types"
import type React from "react"

export type RideExperienceConnection = {
  status: "disconnected" | "connecting" | "connected" | "error"
  reconnect: () => Promise<RideConnectionResult>
  disconnect: () => Promise<void>
  error: TrainerError | null
}

type RideExperienceViewProps = {
  session: RideSessionController
  connection?: RideExperienceConnection
  search?: {
    activityId?: string
    workoutId?: string
    routeId?: string
    routeSegmentId?: string
  }
  activity?: ActivityExperienceAPI
}

export type RideExperiencePlugin = {
  id: string
  displayName: string
  ExperienceView: React.ComponentType<RideExperienceViewProps>
}
