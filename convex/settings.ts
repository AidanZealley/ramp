import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userSettings").first();
  },
});

export const upsert = mutation({
  args: { ftp: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("userSettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, { ftp: args.ftp });
    } else {
      await ctx.db.insert("userSettings", { ftp: args.ftp });
    }
  },
});
