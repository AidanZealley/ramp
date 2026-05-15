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
    // Deprecated legacy field kept optional so old docs validate. It is
    // stripped from client responses after percentage-storage migration.
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
  routes: defineTable({
    title: v.string(),
    source: v.literal("gpx"),
    fileStorageId: v.id("_storage"),
    originalFileName: v.string(),
    contentType: v.string(),
    fileSizeBytes: v.number(),
    stats: v.object({
      distanceMeters: v.number(),
      elevationGainMeters: v.number(),
      elevationLossMeters: v.number(),
      minElevationMeters: v.union(v.number(), v.null()),
      maxElevationMeters: v.union(v.number(), v.null()),
      pointCount: v.number(),
    }),
    bounds: v.union(
      v.object({
        minLat: v.number(),
        minLng: v.number(),
        maxLat: v.number(),
        maxLng: v.number(),
      }),
      v.null()
    ),
    start: v.union(v.object({ lat: v.number(), lng: v.number() }), v.null()),
    finish: v.union(v.object({ lat: v.number(), lng: v.number() }), v.null()),
    previewPoints: v.array(v.object({ x: v.number(), y: v.number() })),
    tags: v.optional(v.array(v.string())),
  }).index("by_source", ["source"]),
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
