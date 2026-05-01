import type { FtmsIndoorBikeData } from "./types"

const SPEED_NOT_PRESENT_FLAG = 1 << 0
const CADENCE_PRESENT_FLAG = 1 << 2
const POWER_PRESENT_FLAG = 1 << 6
const HEART_RATE_PRESENT_FLAG = 1 << 9

export function decodeFtmsIndoorBikeData(view: DataView): FtmsIndoorBikeData {
  let offset = 0
  const flags = view.getUint16(offset, true)
  offset += 2

  let speedMps: number | null = null
  if ((flags & SPEED_NOT_PRESENT_FLAG) === 0) {
    const kilometersPerHour = view.getUint16(offset, true) * 0.01
    speedMps = kilometersPerHour / 3.6
    offset += 2
  }

  let cadenceRpm: number | null = null
  if ((flags & CADENCE_PRESENT_FLAG) !== 0) {
    cadenceRpm = view.getUint16(offset, true) * 0.5
    offset += 2
  }

  if ((flags & (1 << 3)) !== 0) offset += 2
  if ((flags & (1 << 4)) !== 0) offset += 3
  if ((flags & (1 << 5)) !== 0) offset += 2

  let powerWatts: number | null = null
  if ((flags & POWER_PRESENT_FLAG) !== 0) {
    powerWatts = view.getInt16(offset, true)
    offset += 2
  }

  if ((flags & (1 << 7)) !== 0) offset += 2
  if ((flags & (1 << 8)) !== 0) offset += 5

  let heartRateBpm: number | null = null
  if ((flags & HEART_RATE_PRESENT_FLAG) !== 0) {
    heartRateBpm = view.getUint8(offset)
  }

  return {
    powerWatts,
    cadenceRpm,
    speedMps,
    heartRateBpm,
  }
}
