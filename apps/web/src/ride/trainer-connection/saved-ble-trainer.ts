import type { RideSavedTrainer } from "./types"

export const lastBleTrainerStorageKey = "ramp:lastBleTrainer"

export function readSavedTrainer(): RideSavedTrainer | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(lastBleTrainerStorageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<RideSavedTrainer>
    if (typeof parsed.id !== "string" || parsed.id.length === 0) return null
    return {
      id: parsed.id,
      name: typeof parsed.name === "string" ? parsed.name : null,
    }
  } catch {
    return null
  }
}

export function writeSavedTrainer(savedTrainer: RideSavedTrainer): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      lastBleTrainerStorageKey,
      JSON.stringify(savedTrainer)
    )
  } catch {
    // Best effort only.
  }
}

export function clearSavedTrainer(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(lastBleTrainerStorageKey)
  } catch {
    // Best effort only.
  }
}

export function createSavedTrainer(
  device: BluetoothDevice
): RideSavedTrainer | null {
  if (!device.id) return null
  return {
    id: device.id,
    name: device.name ?? null,
  }
}

export function findSavedBleDevice(
  devices: Array<BluetoothDevice>,
  savedTrainer: RideSavedTrainer
): BluetoothDevice | undefined {
  const idMatch = devices.find((candidate) => candidate.id === savedTrainer.id)
  if (idMatch) return idMatch

  const savedName = savedTrainer.name?.trim()
  if (!savedName) return undefined
  return devices.find((candidate) => candidate.name?.trim() === savedName)
}
