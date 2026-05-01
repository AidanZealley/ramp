import type { FtmsSupportedRange } from "./types"

export function decodeSupportedPowerRange(view: DataView): FtmsSupportedRange {
  return {
    min: view.getInt16(0, true),
    max: view.getInt16(2, true),
    increment: view.getUint16(4, true),
  }
}

export function decodeSupportedResistanceLevelRange(
  view: DataView
): FtmsSupportedRange {
  return {
    min: view.getInt16(0, true) / 10,
    max: view.getInt16(2, true) / 10,
    increment: view.getUint16(4, true) / 10,
  }
}
