import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  workouts: defineTable({
    title: v.string(),
    summary: v.optional(
      v.object({
        totalDurationSeconds: v.number(),
        stressScore: v.number(),
      })
    ),
    intervalsRevision: v.optional(v.number()),
    // Legacy field kept optional during rollout so existing docs validate
    // until `migrateAbsoluteWorkoutsToPercentage` has been run everywhere.
    powerMode: v.optional(
      v.union(v.literal("absolute"), v.literal("percentage"))
    ),
    intervals: v.array(
      v.object({
        startPower: v.number(),
        endPower: v.number(),
        durationSeconds: v.number(),
        comment: v.optional(v.string()),
      })
    ),
  }),
  userSettings: defineTable({
    ftp: v.number(),
    powerDisplayMode: v.optional(
      v.union(v.literal("absolute"), v.literal("percentage"))
    ),
  }),
  plans: defineTable({
    title: v.string(),
  }),
  planWeeks: defineTable({
    planId: v.id("plans"),
    orderIndex: v.number(),
  }).index("by_plan_and_order", ["planId", "orderIndex"]),
  planWeekWorkouts: defineTable({
    weekId: v.id("planWeeks"),
    workoutId: v.union(v.id("workouts"), v.null()),
    dayIndex: v.optional(v.number()),
    orderIndex: v.optional(v.number()),
  })
    .index("by_week_and_day", ["weekId", "dayIndex"])
    .index("by_workout", ["workoutId"]),
})
