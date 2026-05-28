import type {
  RideConnectionResult,
  RideSessionController,
} from "@ramp/ride-core"
import type { TrainerError } from "@ramp/trainer-io"
import type { ActivityExperienceAPI } from "@/components/activity/types"
import type { ExperienceSessionAPI } from "@/ride/experience-session"
import type React from "react"

export type RideExperienceConnection = {
  status: "disconnected" | "connecting" | "connected" | "error"
  reconnect: () => Promise<RideConnectionResult>
  disconnect: () => Promise<void>
  error: TrainerError | null
}

type RideExperienceViewProps = {
  session: ExperienceSessionAPI
  connection?: RideExperienceConnection
  search?: {
    activityId?: string
    workoutId?: string
    routeId?: string
  }
  activity?: ActivityExperienceAPI
}

type PrivilegedRideExperienceViewProps = {
  session: RideSessionController
  connection?: RideExperienceConnection
  search?: {
    activityId?: string
    workoutId?: string
    routeId?: string
  }
  activity?: ActivityExperienceAPI
}

export type RideExperiencePlugin =
  | {
      id: string
      displayName: string
      privileged?: false
      ExperienceView: React.ComponentType<RideExperienceViewProps>
    }
  | {
      id: string
      displayName: string
      privileged: true
      ExperienceView: React.ComponentType<PrivilegedRideExperienceViewProps>
    }
