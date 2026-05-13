import type { RideExperienceDefinition } from "@/experiences/types"
import type { RideRuntimeController } from "@/ride/use-ride-runtime"

export type RideConnectionGateProps = {
  experience: RideExperienceDefinition
  trainerController: RideRuntimeController | null
  onConnected: () => void
}
