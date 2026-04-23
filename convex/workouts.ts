import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const intervalValidator = v.object({
  startPower: v.number(),
  endPower: v.number(),
  durationSeconds: v.number(),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("workouts").take(100);
  },
});

export const get = query({
  args: { id: v.id("workouts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    powerMode: v.union(v.literal("absolute"), v.literal("percentage")),
    intervals: v.array(intervalValidator),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workouts", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("workouts"),
    title: v.string(),
    powerMode: v.union(v.literal("absolute"), v.literal("percentage")),
    intervals: v.array(intervalValidator),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: { id: v.id("workouts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
