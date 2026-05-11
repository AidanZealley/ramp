import type { RideExperienceDefinition } from "@/experiences/types"
import type { RideTrainerController } from "@/ride/use-ride-trainer"

export type RideConnectionGateProps = {
  experience: RideExperienceDefinition
  trainerController: RideTrainerController
  onConnected: () => void
}
