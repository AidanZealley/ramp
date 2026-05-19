import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireAuthUserId } from "./authHelpers"

const powerDisplayModeValidator = v.union(
  v.literal("absolute"),
  v.literal("percentage")
)
const routeSimulationProgressModeValidator = v.union(
  v.literal("trainer-speed"),
  v.literal("app-physics")
)
const MIN_FTP = 50
const MAX_FTP = 500
export const DEFAULT_RIDER_WEIGHT_KG = 75
export const DEFAULT_BIKE_WEIGHT_KG = 10
const MIN_RIDER_WEIGHT_KG = 30
const MAX_RIDER_WEIGHT_KG = 250
const MIN_BIKE_WEIGHT_KG = 5
const MAX_BIKE_WEIGHT_KG = 30

export function validateFtp(ftp: number): number {
  if (!Number.isFinite(ftp)) {
    throw new Error("FTP must be finite")
  }
  if (!Number.isInteger(ftp)) {
    throw new Error("FTP must be an integer")
  }
  if (ftp < MIN_FTP || ftp > MAX_FTP) {
    throw new Error(`FTP must be between ${MIN_FTP} and ${MAX_FTP}`)
  }
  return ftp
}

export function validateRiderWeightKg(weight: number): number {
  if (!Number.isFinite(weight)) {
    throw new Error("Rider weight must be finite")
  }
  const normalized = Math.round(weight * 10) / 10
  if (Math.abs(weight - normalized) > Number.EPSILON * 10) {
    throw new Error("Rider weight must have at most one decimal place")
  }
  if (normalized < MIN_RIDER_WEIGHT_KG || normalized > MAX_RIDER_WEIGHT_KG) {
    throw new Error(
      `Rider weight must be between ${MIN_RIDER_WEIGHT_KG} and ${MAX_RIDER_WEIGHT_KG} kg`
    )
  }
  return normalized
}

export function validateBikeWeightKg(weight: number): number {
  if (!Number.isFinite(weight)) {
    throw new Error("Bike weight must be finite")
  }
  const normalized = Math.round(weight * 10) / 10
  if (Math.abs(weight - normalized) > Number.EPSILON * 10) {
    throw new Error("Bike weight must have at most one decimal place")
  }
  if (normalized < MIN_BIKE_WEIGHT_KG || normalized > MAX_BIKE_WEIGHT_KG) {
    throw new Error(
      `Bike weight must be between ${MIN_BIKE_WEIGHT_KG} and ${MAX_BIKE_WEIGHT_KG} kg`
    )
  }
  return normalized
}

export type SettingsValues = {
  ftp?: number
  powerDisplayMode?: "absolute" | "percentage"
  riderWeightKg?: number
  bikeWeightKg?: number
  routeSimulationProgressMode?: "trainer-speed" | "app-physics"
}

export function resolveSettingsValues(
  args: SettingsValues,
  existing?: SettingsValues | null
) {
  return {
    ftp: validateFtp(args.ftp ?? existing?.ftp ?? 150),
    powerDisplayMode:
      args.powerDisplayMode ?? existing?.powerDisplayMode ?? "percentage",
    riderWeightKg: validateRiderWeightKg(
      args.riderWeightKg ?? existing?.riderWeightKg ?? DEFAULT_RIDER_WEIGHT_KG
    ),
    bikeWeightKg: validateBikeWeightKg(
      args.bikeWeightKg ?? existing?.bikeWeightKg ?? DEFAULT_BIKE_WEIGHT_KG
    ),
    routeSimulationProgressMode:
      args.routeSimulationProgressMode ??
      existing?.routeSimulationProgressMode ??
      "trainer-speed",
  }
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx)
    const user = await ctx.db.get(userId)
    return resolveSettingsValues({}, user)
  },
})

export const upsert = mutation({
  args: {
    ftp: v.optional(v.number()),
    powerDisplayMode: v.optional(powerDisplayModeValidator),
    riderWeightKg: v.optional(v.number()),
    bikeWeightKg: v.optional(v.number()),
    routeSimulationProgressMode: v.optional(
      routeSimulationProgressModeValidator
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const user = await ctx.db.get(userId)
    if (!user) {
      throw new Error("User not found")
    }
    const next = resolveSettingsValues(args, user)

    await ctx.db.patch(userId, {
      ftp: next.ftp,
      powerDisplayMode: next.powerDisplayMode,
      riderWeightKg: next.riderWeightKg,
      bikeWeightKg: next.bikeWeightKg,
      routeSimulationProgressMode: next.routeSimulationProgressMode,
    })
  },
})
