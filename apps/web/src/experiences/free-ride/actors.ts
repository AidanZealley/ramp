import { FREE_RIDE_TARGETS } from "./free-ride-config"
import { getRacingLineOffset } from "./track"

export type FreeRideActorKind = "target-drone"

export type FreeRideActor = {
  id: string
  kind: FreeRideActorKind
  leadMeters: number
  distance: number
  gapMeters: number
  lateralOffsetMeters: number
  visible: boolean
}

const TARGET_DRONE_ID = "target-drone-primary"

export function getTargetDroneActor(input: {
  riderDistanceMeters: number
  leadMeters?: number
}): FreeRideActor {
  const leadMeters = input.leadMeters ?? FREE_RIDE_TARGETS.defaultLeadMeters
  const distance = input.riderDistanceMeters + leadMeters

  return {
    id: TARGET_DRONE_ID,
    kind: "target-drone",
    leadMeters,
    distance,
    gapMeters: leadMeters,
    lateralOffsetMeters: getRacingLineOffset(distance),
    visible: true,
  }
}
