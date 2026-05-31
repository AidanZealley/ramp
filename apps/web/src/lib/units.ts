export type UnitSystem = "metric" | "imperial"

export type DisplayUnitValue = {
  value: number
  unit: string
}

export type DistanceFormatOptions = {
  precision?: number
  compactUnderKm?: boolean
}

const METERS_PER_MILE = 1609.344
const FEET_PER_METER = 3.28084
const POUNDS_PER_KG = 2.20462262185
const MPH_PER_KPH = 0.621371192237

const safeNumber = (value: number, fallback = 0) =>
  Number.isFinite(value) ? value : fallback

export function metersToDisplayDistance(
  meters: number,
  unitSystem: UnitSystem
): DisplayUnitValue {
  const safeMeters = Math.max(0, safeNumber(meters))
  if (unitSystem === "imperial") {
    return { value: safeMeters / METERS_PER_MILE, unit: "mi" }
  }
  return { value: safeMeters / 1000, unit: "km" }
}

export function metersToDisplayElevation(
  meters: number,
  unitSystem: UnitSystem
): DisplayUnitValue {
  const safeMeters = safeNumber(meters)
  if (unitSystem === "imperial") {
    return { value: safeMeters * FEET_PER_METER, unit: "ft" }
  }
  return { value: safeMeters, unit: "m" }
}

export function kphToDisplaySpeed(
  kph: number,
  unitSystem: UnitSystem
): DisplayUnitValue {
  const safeKph = Math.max(0, safeNumber(kph))
  if (unitSystem === "imperial") {
    return { value: safeKph * MPH_PER_KPH, unit: "mph" }
  }
  return { value: safeKph, unit: "km/h" }
}

export function mpsToDisplaySpeed(
  mps: number | null,
  unitSystem: UnitSystem
): DisplayUnitValue | null {
  if (mps === null || !Number.isFinite(mps)) return null
  return kphToDisplaySpeed(mps * 3.6, unitSystem)
}

export function kgToDisplayWeight(
  kg: number,
  unitSystem: UnitSystem
): DisplayUnitValue {
  const safeKg = safeNumber(kg)
  if (unitSystem === "imperial") {
    return { value: safeKg * POUNDS_PER_KG, unit: "lb" }
  }
  return { value: safeKg, unit: "kg" }
}

export function displayWeightToKg(
  value: number,
  unitSystem: UnitSystem
): number {
  if (!Number.isFinite(value)) return Number.NaN
  return unitSystem === "imperial" ? value / POUNDS_PER_KG : value
}

export function formatDistanceMeters(
  meters: number,
  unitSystem: UnitSystem,
  options: DistanceFormatOptions = {}
): string {
  const precision = options.precision ?? 1
  const safeMeters = Math.max(0, safeNumber(meters))

  if (
    unitSystem === "metric" &&
    options.compactUnderKm &&
    safeMeters < 1000
  ) {
    return `${Math.round(safeMeters).toLocaleString()} m`
  }

  const { value, unit } = metersToDisplayDistance(safeMeters, unitSystem)
  return `${value.toFixed(precision)} ${unit}`
}

export function formatElevationMeters(
  meters: number | null | undefined,
  unitSystem: UnitSystem
): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) {
    return "No elevation"
  }
  const { value, unit } = metersToDisplayElevation(meters, unitSystem)
  return `${Math.round(value).toLocaleString()} ${unit}`
}

export function formatSpeedKph(
  kph: number | null | undefined,
  unitSystem: UnitSystem
): string {
  const unit = unitSystem === "imperial" ? "mph" : "km/h"
  if (kph === null || kph === undefined || !Number.isFinite(kph)) {
    return `-- ${unit}`
  }
  const display = kphToDisplaySpeed(kph, unitSystem)
  return `${display.value.toFixed(1)} ${display.unit}`
}

export function formatSpeedMps(
  mps: number | null | undefined,
  unitSystem: UnitSystem
): string {
  const unit = unitSystem === "imperial" ? "mph" : "km/h"
  if (mps === null || mps === undefined || !Number.isFinite(mps)) {
    return `-- ${unit}`
  }
  const display = mpsToDisplaySpeed(mps, unitSystem)
  return display ? `${display.value.toFixed(1)} ${display.unit}` : `-- ${unit}`
}

export function formatWeightKg(kg: number, unitSystem: UnitSystem): string {
  const { value, unit } = kgToDisplayWeight(kg, unitSystem)
  return `${value.toFixed(1)} ${unit}`
}
