import type { FtmsIndoorBikeData } from "./types"

const SPEED_NOT_PRESENT_FLAG = 1 << 0
const CADENCE_PRESENT_FLAG = 1 << 2
const POWER_PRESENT_FLAG = 1 << 6
const HEART_RATE_PRESENT_FLAG = 1 << 9

export function decodeFtmsIndoorBikeData(view: DataView): FtmsIndoorBikeData {
  let offset = 0
  requireBytes(view, offset, 2, "flags")
  const flags = view.getUint16(offset, true)
  offset += 2

  let speedMps: number | null = null
  if ((flags & SPEED_NOT_PRESENT_FLAG) === 0) {
    requireBytes(view, offset, 2, "instantaneous speed")
    const kilometersPerHour = view.getUint16(offset, true) * 0.01
    speedMps = kilometersPerHour / 3.6
    offset += 2
  }

  let cadenceRpm: number | null = null
  if ((flags & CADENCE_PRESENT_FLAG) !== 0) {
    requireBytes(view, offset, 2, "instantaneous cadence")
    cadenceRpm = view.getUint16(offset, true) * 0.5
    offset += 2
  }

  if ((flags & (1 << 3)) !== 0)
    offset = skipBytes(view, offset, 2, "total distance")
  if ((flags & (1 << 4)) !== 0)
    offset = skipBytes(view, offset, 3, "resistance level")
  if ((flags & (1 << 5)) !== 0)
    offset = skipBytes(view, offset, 2, "instantaneous power")

  let powerWatts: number | null = null
  if ((flags & POWER_PRESENT_FLAG) !== 0) {
    requireBytes(view, offset, 2, "average power")
    powerWatts = view.getInt16(offset, true)
    offset += 2
  }

  if ((flags & (1 << 7)) !== 0)
    offset = skipBytes(view, offset, 2, "expended energy")
  if ((flags & (1 << 8)) !== 0)
    offset = skipBytes(view, offset, 5, "heart rate")

  let heartRateBpm: number | null = null
  if ((flags & HEART_RATE_PRESENT_FLAG) !== 0) {
    requireBytes(view, offset, 1, "metabolic equivalent")
    heartRateBpm = view.getUint8(offset)
  }

  return {
    powerWatts,
    cadenceRpm,
    speedMps,
    heartRateBpm,
  }
}

function skipBytes(
  view: DataView,
  offset: number,
  byteLength: number,
  field: string
): number {
  requireBytes(view, offset, byteLength, field)
  return offset + byteLength
}

function requireBytes(
  view: DataView,
  offset: number,
  byteLength: number,
  field: string
): void {
  if (offset + byteLength <= view.byteLength) return
  throw new Error(`Malformed FTMS indoor bike data: missing ${field}.`)
}
