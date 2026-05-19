import { defineSchema, defineTable } from "convex/server"
import { authTables } from "@convex-dev/auth/server"
import { v } from "convex/values"

const { users: _users, ...authTablesWithoutUsers } = authTables

const appSettingsFields = {
  ftp: v.optional(v.number()),
  powerDisplayMode: v.optional(
    v.union(v.literal("absolute"), v.literal("percentage"))
  ),
  riderWeightKg: v.optional(v.number()),
  bikeWeightKg: v.optional(v.number()),
  routeSimulationProgressMode: v.optional(
    v.union(v.literal("trainer-speed"), v.literal("app-physics"))
  ),
}

export default defineSchema({
  ...authTablesWithoutUsers,
  // This intentionally mirrors @convex-dev/auth's authTables.users schema and
  // indexes, with stable app settings added to keep one profile row per user.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    ...appSettingsFields,
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  workouts: defineTable({
    ownerId: v.id("users"),
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
  }).index("by_ownerId", ["ownerId"]),
  plans: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
  }).index("by_ownerId", ["ownerId"]),
  routes: defineTable({
    ownerId: v.id("users"),
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
  })
    .index("by_source", ["source"])
    .index("by_ownerId", ["ownerId"]),
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
