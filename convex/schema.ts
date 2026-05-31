import { defineSchema, defineTable } from "convex/server"
import { authTables } from "@convex-dev/auth/server"
import { v } from "convex/values"

const { users: _users, ...authTablesWithoutUsers } = authTables

const userPreferenceFields = {
  ftp: v.optional(v.number()),
  powerDisplayMode: v.optional(
    v.union(v.literal("absolute"), v.literal("percentage"))
  ),
  riderWeightKg: v.optional(v.number()),
  bikeWeightKg: v.optional(v.number()),
  routeSimulationProgressMode: v.optional(
    v.union(v.literal("trainer-speed"), v.literal("app-physics"))
  ),
  unitSystem: v.optional(v.union(v.literal("metric"), v.literal("imperial"))),
}

export default defineSchema({
  ...authTablesWithoutUsers,
  // This intentionally mirrors @convex-dev/auth's authTables.users schema and
  // indexes, with stable user preferences stored on the auth user row.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    ...userPreferenceFields,
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  inviteCodes: defineTable({
    email: v.string(),
    codeHash: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    usedBy: v.optional(v.id("users")),
    usedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_codeHash", ["codeHash"])
    .index("by_createdBy", ["createdBy"]),
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
  routeSegments: defineTable({
    ownerId: v.id("users"),
    routeId: v.id("routes"),
    type: v.literal("climb"),
    startDistanceMeters: v.number(),
    endDistanceMeters: v.number(),
    distanceMeters: v.number(),
    startElevationMeters: v.number(),
    endElevationMeters: v.number(),
    elevationGainMeters: v.number(),
    averageGradient: v.number(),
    previewSamples: v.array(
      v.object({
        distanceMeters: v.number(),
        elevationMeters: v.number(),
      })
    ),
    source: v.literal("generated"),
    generatedAt: v.number(),
  })
    .index("by_routeId_and_startDistanceMeters", [
      "routeId",
      "startDistanceMeters",
    ])
    .index("by_ownerId", ["ownerId"]),
  activities: defineTable({
    ownerId: v.id("users"),
    status: v.union(
      v.literal("in_progress"),
      v.literal("pending"),
      v.literal("completed")
    ),
    experienceId: v.string(),
    sourceKind: v.union(v.literal("workout"), v.literal("route")),
    sourceWorkoutId: v.optional(v.union(v.id("workouts"), v.null())),
    sourceRouteId: v.optional(v.union(v.id("routes"), v.null())),
    title: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    savedAt: v.optional(v.number()),
    updatedAt: v.number(),
    summary: v.object({
      durationSeconds: v.number(),
      distanceMeters: v.number(),
      plannedAverageWatts: v.optional(v.union(v.number(), v.null())),
      elevationGainMeters: v.optional(v.union(v.number(), v.null())),
      elevationLossMeters: v.optional(v.union(v.number(), v.null())),
      completionPercent: v.optional(v.union(v.number(), v.null())),
    }),
    sourceSnapshot: v.union(
      v.object({
        kind: v.literal("workout"),
        workoutId: v.id("workouts"),
        title: v.string(),
        intervalsRevision: v.number(),
        ftpAtStart: v.number(),
        totalDurationSeconds: v.number(),
        intervals: v.array(
          v.object({
            startPower: v.number(),
            endPower: v.number(),
            durationSeconds: v.number(),
            comment: v.optional(v.string()),
          })
        ),
      }),
      v.object({
        kind: v.literal("route"),
        routeId: v.id("routes"),
        title: v.string(),
        originalFileName: v.string(),
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
        start: v.union(
          v.object({ lat: v.number(), lng: v.number() }),
          v.null()
        ),
        finish: v.union(
          v.object({ lat: v.number(), lng: v.number() }),
          v.null()
        ),
        previewPoints: v.array(v.object({ x: v.number(), y: v.number() })),
      })
    ),
    resumeState: v.union(
      v.object({
        kind: v.literal("workout"),
        elapsedSeconds: v.number(),
        difficultyPercent: v.number(),
      }),
      v.object({
        kind: v.literal("route"),
        elapsedSeconds: v.number(),
        distanceMeters: v.number(),
        progressMode: v.union(
          v.literal("trainer-speed"),
          v.literal("app-physics")
        ),
        smoothingLevel: v.number(),
      })
    ),
  })
    .index("by_ownerId_and_status_and_updatedAt", [
      "ownerId",
      "status",
      "updatedAt",
    ])
    .index("by_ownerId_and_status_and_endedAt", [
      "ownerId",
      "status",
      "endedAt",
    ])
    .index("by_ownerId_and_sourceWorkoutId_and_status", [
      "ownerId",
      "sourceWorkoutId",
      "status",
    ])
    .index("by_ownerId_and_sourceRouteId_and_status", [
      "ownerId",
      "sourceRouteId",
      "status",
    ]),
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
