import type { RideExperienceDefinition } from "@/experiences/types"
import type { RideRuntime } from "@/ride/use-ride-runtime"

export type RideConnectionGateProps = {
  experience: RideExperienceDefinition
  trainerController: RideRuntime
  onConnected: () => void
}
