import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

const powerDisplayModeValidator = v.union(
  v.literal("absolute"),
  v.literal("percentage")
)

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
    const nextFtp = args.ftp ?? existing?.ftp ?? 150
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
