import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  workouts: defineTable({
    title: v.string(),
    powerMode: v.union(v.literal("absolute"), v.literal("percentage")),
    intervals: v.array(
      v.object({
        startPower: v.number(),
        endPower: v.number(),
        durationSeconds: v.number(),
      })
    ),
  }),
  userSettings: defineTable({
    ftp: v.number(),
  }),
});
