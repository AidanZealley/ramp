import type { FtmsIndoorBikeData } from "./types"

const SPEED_NOT_PRESENT_FLAG = 1 << 0
const CADENCE_PRESENT_FLAG = 1 << 2
const POWER_PRESENT_FLAG = 1 << 6
const HEART_RATE_PRESENT_FLAG = 1 << 9

export function decodeFtmsIndoorBikeData(view: DataView): FtmsIndoorBikeData {
  let offset = 0
  const requireBytes = (bytes: number, field: string) => {
    if (offset + bytes > view.byteLength) {
      const error = new Error(`Malformed indoor bike data: missing ${field}.`)
      Object.assign(error, { code: "validation" })
      throw error
    }
  }
  requireBytes(2, "flags")
  const flags = view.getUint16(offset, true)
  offset += 2

  let speedMps: number | null = null
  if ((flags & SPEED_NOT_PRESENT_FLAG) === 0) {
    requireBytes(2, "speed")
    const kilometersPerHour = view.getUint16(offset, true) * 0.01
    speedMps = kilometersPerHour / 3.6
    offset += 2
  }

  let cadenceRpm: number | null = null
  if ((flags & CADENCE_PRESENT_FLAG) !== 0) {
    requireBytes(2, "cadence")
    cadenceRpm = view.getUint16(offset, true) * 0.5
    offset += 2
  }

  if ((flags & (1 << 3)) !== 0) {
    requireBytes(2, "total distance")
    offset += 2
  }
  if ((flags & (1 << 4)) !== 0) {
    requireBytes(3, "resistance level")
    offset += 3
  }
  if ((flags & (1 << 5)) !== 0) {
    requireBytes(2, "instantaneous power")
    offset += 2
  }

  let powerWatts: number | null = null
  if ((flags & POWER_PRESENT_FLAG) !== 0) {
    requireBytes(2, "power")
    powerWatts = view.getInt16(offset, true)
    offset += 2
  }

  if ((flags & (1 << 7)) !== 0) {
    requireBytes(2, "expended energy")
    offset += 2
  }
  if ((flags & (1 << 8)) !== 0) {
    requireBytes(5, "metabolic equivalent")
    offset += 5
  }

  let heartRateBpm: number | null = null
  if ((flags & HEART_RATE_PRESENT_FLAG) !== 0) {
    requireBytes(1, "heart rate")
    heartRateBpm = view.getUint8(offset)
  }

  return {
    powerWatts,
    cadenceRpm,
    speedMps,
    heartRateBpm,
  }
}
