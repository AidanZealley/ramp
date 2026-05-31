import { useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "#convex/_generated/api"
import {
  displayWeightToKg,
  formatDistanceMeters,
  formatElevationMeters,
  formatSpeedKph,
  formatSpeedMps,
  formatWeightKg,
  kgToDisplayWeight,
  type DistanceFormatOptions,
  type UnitSystem,
} from "@/lib/units"

export function useUnitFormatters() {
  const preferences = useQuery(api.preferences.get)
  const unitSystem: UnitSystem = preferences?.unitSystem ?? "metric"
  const preferencesReady = preferences !== undefined

  return useMemo(
    () => ({
      unitSystem,
      preferencesReady,
      distance: (meters: number, options?: DistanceFormatOptions) =>
        formatDistanceMeters(meters, unitSystem, options),
      elevation: (meters: number | null | undefined) =>
        formatElevationMeters(meters, unitSystem),
      speedKph: (kph: number | null | undefined) =>
        formatSpeedKph(kph, unitSystem),
      speedMps: (mps: number | null | undefined) =>
        formatSpeedMps(mps, unitSystem),
      weight: (kg: number) => formatWeightKg(kg, unitSystem),
      weightValue: (kg: number) => kgToDisplayWeight(kg, unitSystem),
      weightInputToKg: (value: number) => displayWeightToKg(value, unitSystem),
    }),
    [preferencesReady, unitSystem]
  )
}
