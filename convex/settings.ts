import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const powerDisplayModeValidator = v.union(
  v.literal("absolute"),
  v.literal("percentage")
)
const MIN_FTP = 50
const MAX_FTP = 500

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

export const get = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("userSettings").first()
    return {
      ftp: settings?.ftp ?? 150,
      powerDisplayMode: settings?.powerDisplayMode ?? "percentage",
    }
  },
})

export const upsert = mutation({
  args: {
    ftp: v.optional(v.number()),
    powerDisplayMode: v.optional(powerDisplayModeValidator),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("userSettings").first()
    const nextFtp = validateFtp(args.ftp ?? existing?.ftp ?? 150)
    const nextPowerDisplayMode =
      args.powerDisplayMode ?? existing?.powerDisplayMode ?? "percentage"

    if (existing) {
      await ctx.db.patch(existing._id, {
        ftp: nextFtp,
        powerDisplayMode: nextPowerDisplayMode,
      })
    } else {
      await ctx.db.insert("userSettings", {
        ftp: nextFtp,
        powerDisplayMode: nextPowerDisplayMode,
      })
    }
  },
})
