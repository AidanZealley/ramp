import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const powerDisplayModeValidator = v.union(
  v.literal("absolute"),
  v.literal("percentage")
)
const MIN_FTP = 50
const MAX_FTP = 500
const DEFAULT_RIDER_WEIGHT_KG = 75
const MIN_RIDER_WEIGHT_KG = 30
const MAX_RIDER_WEIGHT_KG = 250

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

export const get = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("userSettings").first()
    return {
      ftp: settings?.ftp ?? 150,
      powerDisplayMode: settings?.powerDisplayMode ?? "percentage",
      riderWeightKg:
        settings?.riderWeightKg === undefined
          ? DEFAULT_RIDER_WEIGHT_KG
          : validateRiderWeightKg(settings.riderWeightKg),
    }
  },
})

export const upsert = mutation({
  args: {
    ftp: v.optional(v.number()),
    powerDisplayMode: v.optional(powerDisplayModeValidator),
    riderWeightKg: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("userSettings").first()
    const nextFtp = validateFtp(args.ftp ?? existing?.ftp ?? 150)
    const nextPowerDisplayMode =
      args.powerDisplayMode ?? existing?.powerDisplayMode ?? "percentage"
    const nextRiderWeightKg = validateRiderWeightKg(
      args.riderWeightKg ?? existing?.riderWeightKg ?? DEFAULT_RIDER_WEIGHT_KG
    )

    if (existing) {
      await ctx.db.patch(existing._id, {
        ftp: nextFtp,
        powerDisplayMode: nextPowerDisplayMode,
        riderWeightKg: nextRiderWeightKg,
      })
    } else {
      await ctx.db.insert("userSettings", {
        ftp: nextFtp,
        powerDisplayMode: nextPowerDisplayMode,
        riderWeightKg: nextRiderWeightKg,
      })
    }
  },
})
