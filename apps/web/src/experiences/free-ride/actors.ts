import { FREE_RIDE_TARGETS } from "./free-ride-config"
import { clamp, getRacingLineOffset } from "./track"

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
  gapMeters?: number
  leadMeters?: number
  visible?: boolean
}): FreeRideActor {
  const gapMeters =
    input.gapMeters ?? input.leadMeters ?? FREE_RIDE_TARGETS.defaultLeadMeters
  const leadMeters = gapMeters
  const distance = input.riderDistanceMeters + gapMeters

  return {
    id: TARGET_DRONE_ID,
    kind: "target-drone",
    leadMeters,
    distance,
    gapMeters,
    lateralOffsetMeters: getRacingLineOffset(distance),
    visible: input.visible ?? true,
  }
}

export function getDroneCruisePowerWatts(input: {
  riderFtpWatts: number
}): number {
  const riderFtpWatts = Number.isFinite(input.riderFtpWatts)
    ? Math.max(1, input.riderFtpWatts)
    : 1
  return riderFtpWatts * FREE_RIDE_TARGETS.droneCruiseFtpRatio
}

export function getTargetDroneRelativeSpeedMps(input: {
  riderPowerWatts: number | null
  riderFtpWatts: number
}): number {
  if (
    input.riderPowerWatts === null ||
    !Number.isFinite(input.riderPowerWatts) ||
    !Number.isFinite(input.riderFtpWatts)
  ) {
    return 0
  }

  const dronePowerWatts = getDroneCruisePowerWatts({
    riderFtpWatts: input.riderFtpWatts,
  })
  const powerDeltaWatts = input.riderPowerWatts - dronePowerWatts
  const ftpDelta = powerDeltaWatts / Math.max(1, input.riderFtpWatts)
  const relativeSpeed =
    ftpDelta * FREE_RIDE_TARGETS.relativeSpeedMpsAtFtpDelta

  return clamp(
    relativeSpeed,
    -FREE_RIDE_TARGETS.maxOpeningSpeedMps,
    FREE_RIDE_TARGETS.maxClosingSpeedMps
  )
}

export function getNextTargetDroneGapMeters(input: {
  currentGapMeters: number
  riderPowerWatts: number | null
  riderFtpWatts: number
  deltaSeconds: number
}): number {
  const currentGapMeters = Number.isFinite(input.currentGapMeters)
    ? input.currentGapMeters
    : FREE_RIDE_TARGETS.defaultLeadMeters
  const clampedCurrentGapMeters = clamp(
    currentGapMeters,
    FREE_RIDE_TARGETS.minGapMeters,
    FREE_RIDE_TARGETS.maxGapMeters
  )

  if (input.deltaSeconds <= 0 || !Number.isFinite(input.deltaSeconds)) {
    return clampedCurrentGapMeters
  }

  const relativeSpeedMps = getTargetDroneRelativeSpeedMps({
    riderPowerWatts: input.riderPowerWatts,
    riderFtpWatts: input.riderFtpWatts,
  })
  const nextGap = clampedCurrentGapMeters - relativeSpeedMps * input.deltaSeconds

  return clamp(
    Number.isFinite(nextGap) ? nextGap : FREE_RIDE_TARGETS.defaultLeadMeters,
    FREE_RIDE_TARGETS.minGapMeters,
    FREE_RIDE_TARGETS.maxGapMeters
  )
}
