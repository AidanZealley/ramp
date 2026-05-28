import { paginationOptsValidator } from "convex/server"
import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import {
  requireAuthUserId,
  requireOwnedRoute,
  requireOwnedWorkout,
} from "./authHelpers"
import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"

const UNRESOLVED_STATUSES = ["in_progress", "pending"] as const

export const activitySummaryValidator = v.object({
  durationSeconds: v.number(),
  distanceMeters: v.number(),
  plannedAverageWatts: v.optional(v.union(v.number(), v.null())),
  elevationGainMeters: v.optional(v.union(v.number(), v.null())),
  elevationLossMeters: v.optional(v.union(v.number(), v.null())),
  completionPercent: v.optional(v.union(v.number(), v.null())),
})

export const activityResumeStateValidator = v.union(
  v.object({
    kind: v.literal("workout"),
    elapsedSeconds: v.number(),
    difficultyPercent: v.number(),
  }),
  v.object({
    kind: v.literal("route"),
    elapsedSeconds: v.number(),
    distanceMeters: v.number(),
    progressMode: v.union(v.literal("trainer-speed"), v.literal("app-physics")),
    smoothingLevel: v.number(),
  })
)

type Ctx = QueryCtx | MutationCtx
type ActivityStatus = Doc<"activities">["status"]
type UnresolvedActivityStatus = (typeof UNRESOLVED_STATUSES)[number]
type SourceKind = Doc<"activities">["sourceKind"]

export type UnresolvedActivityExistsErrorData = {
  kind: "unresolvedActivityExists"
  activityId: Id<"activities">
}

export type LinkedUnresolvedActivityErrorData = {
  kind: "linkedUnresolvedActivity"
  activityId: Id<"activities">
  status: UnresolvedActivityStatus
  title: string
}

export function normalizeActivityTitle(title: string): string {
  const normalized = title.replace(/\s+/g, " ").trim()
  if (!normalized) {
    throw new Error("Activity title must not be empty")
  }
  return normalized.slice(0, 160)
}

export function computePlannedAverageWatts(
  intervals: Array<{
    startPower: number
    endPower: number
    durationSeconds: number
  }>,
  ftpAtStart: number
): number | null {
  let weightedPercentSeconds = 0
  let totalDurationSeconds = 0

  for (const interval of intervals) {
    const durationSeconds = Math.max(0, interval.durationSeconds)
    totalDurationSeconds += durationSeconds
    weightedPercentSeconds +=
      ((interval.startPower + interval.endPower) / 2) * durationSeconds
  }

  if (totalDurationSeconds <= 0) {
    return null
  }

  return Math.round(
    (weightedPercentSeconds / totalDurationSeconds / 100) * ftpAtStart
  )
}

export function createWorkoutSnapshot(
  workout: Doc<"workouts">,
  ftpAtStart: number
) {
  return {
    kind: "workout" as const,
    workoutId: workout._id,
    title: workout.title,
    intervalsRevision: workout.intervalsRevision ?? 0,
    ftpAtStart,
    totalDurationSeconds: workout.intervals.reduce(
      (total, interval) => total + Math.max(0, interval.durationSeconds),
      0
    ),
    intervals: workout.intervals,
  }
}

export function createRouteSnapshot(route: Doc<"routes">) {
  return {
    kind: "route" as const,
    routeId: route._id,
    title: route.title,
    originalFileName: route.originalFileName,
    stats: route.stats,
    bounds: route.bounds,
    start: route.start,
    finish: route.finish,
    previewPoints: route.previewPoints,
  }
}

function emptyWorkoutSummary(
  snapshot: ReturnType<typeof createWorkoutSnapshot>
) {
  return {
    durationSeconds: 0,
    distanceMeters: 0,
    plannedAverageWatts: computePlannedAverageWatts(
      snapshot.intervals,
      snapshot.ftpAtStart
    ),
    completionPercent: 0,
  }
}

function emptyRouteSummary() {
  return {
    durationSeconds: 0,
    distanceMeters: 0,
    elevationGainMeters: 0,
    elevationLossMeters: 0,
    completionPercent: 0,
  }
}

function assertFiniteMetric(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`)
  }
}

function validateSummary(summary: Doc<"activities">["summary"]) {
  assertFiniteMetric(summary.durationSeconds, "durationSeconds")
  assertFiniteMetric(summary.distanceMeters, "distanceMeters")
  if (
    summary.plannedAverageWatts !== undefined &&
    summary.plannedAverageWatts !== null
  ) {
    assertFiniteMetric(summary.plannedAverageWatts, "plannedAverageWatts")
  }
  if (
    summary.elevationGainMeters !== undefined &&
    summary.elevationGainMeters !== null
  ) {
    assertFiniteMetric(summary.elevationGainMeters, "elevationGainMeters")
  }
  if (
    summary.elevationLossMeters !== undefined &&
    summary.elevationLossMeters !== null
  ) {
    assertFiniteMetric(summary.elevationLossMeters, "elevationLossMeters")
  }
  if (
    summary.completionPercent !== undefined &&
    summary.completionPercent !== null
  ) {
    assertFiniteMetric(summary.completionPercent, "completionPercent")
  }
}

function validateResumeState(
  resumeState: Doc<"activities">["resumeState"],
  sourceKind: SourceKind
) {
  if (resumeState.kind !== sourceKind) {
    throw new Error("Resume state kind does not match activity source")
  }
  assertFiniteMetric(resumeState.elapsedSeconds, "elapsedSeconds")
  if (resumeState.kind === "workout") {
    assertFiniteMetric(resumeState.difficultyPercent, "difficultyPercent")
    return
  }
  assertFiniteMetric(resumeState.distanceMeters, "distanceMeters")
  assertFiniteMetric(resumeState.smoothingLevel, "smoothingLevel")
}

async function getOwnedActivity(
  ctx: Ctx,
  activityId: Id<"activities">,
  ownerId?: Id<"users">
): Promise<Doc<"activities"> | null> {
  const resolvedOwnerId = ownerId ?? (await requireAuthUserId(ctx))
  const activity = await ctx.db.get(activityId)
  if (!activity || activity.ownerId !== resolvedOwnerId) {
    return null
  }
  return activity
}

async function requireOwnedActivity(
  ctx: Ctx,
  activityId: Id<"activities">,
  ownerId?: Id<"users">
): Promise<Doc<"activities">> {
  const activity = await getOwnedActivity(ctx, activityId, ownerId)
  if (!activity) {
    throw new Error("Not found")
  }
  return activity
}

async function getUnresolvedByStatus(
  ctx: Ctx,
  ownerId: Id<"users">,
  status: UnresolvedActivityStatus
) {
  const rows = await ctx.db
    .query("activities")
    .withIndex("by_ownerId_and_status_and_updatedAt", (q) =>
      q.eq("ownerId", ownerId).eq("status", status)
    )
    .order("desc")
    .take(1)
  return rows[0] ?? null
}

async function getUnresolvedActivity(ctx: Ctx, ownerId: Id<"users">) {
  const activities = (
    await Promise.all(
      UNRESOLVED_STATUSES.map((status) =>
        getUnresolvedByStatus(ctx, ownerId, status)
      )
    )
  ).filter((activity): activity is Doc<"activities"> => activity !== null)

  return activities.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
}

async function getUnresolvedForSource(
  ctx: Ctx,
  ownerId: Id<"users">,
  sourceKind: "workout",
  sourceId: Id<"workouts">
): Promise<Doc<"activities"> | null>
async function getUnresolvedForSource(
  ctx: Ctx,
  ownerId: Id<"users">,
  sourceKind: "route",
  sourceId: Id<"routes">
): Promise<Doc<"activities"> | null>
async function getUnresolvedForSource(
  ctx: Ctx,
  ownerId: Id<"users">,
  sourceKind: SourceKind,
  sourceId: Id<"workouts"> | Id<"routes">
): Promise<Doc<"activities"> | null> {
  const rows = await Promise.all(
    UNRESOLVED_STATUSES.map((status) => {
      if (sourceKind === "workout") {
        return ctx.db
          .query("activities")
          .withIndex("by_ownerId_and_sourceWorkoutId_and_status", (q) =>
            q
              .eq("ownerId", ownerId)
              .eq("sourceWorkoutId", sourceId as Id<"workouts">)
              .eq("status", status)
          )
          .take(1)
      }

      return ctx.db
        .query("activities")
        .withIndex("by_ownerId_and_sourceRouteId_and_status", (q) =>
          q
            .eq("ownerId", ownerId)
            .eq("sourceRouteId", sourceId as Id<"routes">)
            .eq("status", status)
        )
        .take(1)
    })
  )

  return rows.flat().sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
}

async function assertNoUnresolvedActivity(ctx: Ctx, ownerId: Id<"users">) {
  const unresolved = await getUnresolvedActivity(ctx, ownerId)
  if (unresolved) {
    throw new ConvexError({
      kind: "unresolvedActivityExists",
      activityId: unresolved._id,
    } satisfies UnresolvedActivityExistsErrorData)
  }
}

function assertActivityStatus(
  activity: Doc<"activities">,
  allowedStatuses: Array<ActivityStatus>
) {
  if (!allowedStatuses.includes(activity.status)) {
    throw new Error("Activity status does not allow this operation")
  }
}

export async function handleLinkedUnresolvedActivityForSource(
  ctx: MutationCtx,
  args:
    | {
        ownerId: Id<"users">
        sourceKind: "workout"
        sourceId: Id<"workouts">
        deleteLinkedUnresolvedActivity?: boolean
      }
    | {
        ownerId: Id<"users">
        sourceKind: "route"
        sourceId: Id<"routes">
        deleteLinkedUnresolvedActivity?: boolean
      }
) {
  const activity =
    args.sourceKind === "workout"
      ? await getUnresolvedForSource(
          ctx,
          args.ownerId,
          args.sourceKind,
          args.sourceId
        )
      : await getUnresolvedForSource(
          ctx,
          args.ownerId,
          args.sourceKind,
          args.sourceId
        )

  if (!activity) {
    return null
  }

  if (args.deleteLinkedUnresolvedActivity !== true) {
    throw new ConvexError({
      kind: "linkedUnresolvedActivity",
      activityId: activity._id,
      status: activity.status as UnresolvedActivityStatus,
      title: activity.title,
    } satisfies LinkedUnresolvedActivityErrorData)
  }

  await ctx.db.delete(activity._id)
  return activity
}

export const get = query({
  args: { activityId: v.id("activities") },
  handler: async (ctx, args) => {
    return await getOwnedActivity(ctx, args.activityId)
  },
})

export const getUnresolved = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireAuthUserId(ctx)
    return await getUnresolvedActivity(ctx, ownerId)
  },
})

export const listCompleted = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const ownerId = await requireAuthUserId(ctx)
    return await ctx.db
      .query("activities")
      .withIndex("by_ownerId_and_status_and_endedAt", (q) =>
        q.eq("ownerId", ownerId).eq("status", "completed")
      )
      .order("desc")
      .paginate(args.paginationOpts)
  },
})

export const getOpenForSource = query({
  args: {
    sourceKind: v.union(v.literal("workout"), v.literal("route")),
    sourceId: v.union(v.id("workouts"), v.id("routes")),
  },
  handler: async (ctx, args) => {
    const ownerId = await requireAuthUserId(ctx)
    if (args.sourceKind === "workout") {
      return await getUnresolvedForSource(
        ctx,
        ownerId,
        "workout",
        args.sourceId as Id<"workouts">
      )
    }
    return await getUnresolvedForSource(
      ctx,
      ownerId,
      "route",
      args.sourceId as Id<"routes">
    )
  },
})

export const start = mutation({
  args: {
    activity: v.union(
      v.object({
        sourceKind: v.literal("workout"),
        workoutId: v.id("workouts"),
        experienceId: v.literal("live-workout"),
        ftpAtStart: v.number(),
      }),
      v.object({
        sourceKind: v.literal("route"),
        routeId: v.id("routes"),
        experienceId: v.literal("route"),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ownerId = await requireAuthUserId(ctx)
    await assertNoUnresolvedActivity(ctx, ownerId)

    const now = Date.now()
    const activityId =
      args.activity.sourceKind === "workout"
        ? await startWorkoutActivity(ctx, ownerId, args.activity, now)
        : await startRouteActivity(ctx, ownerId, args.activity, now)
    const activity = await ctx.db.get(activityId)
    if (!activity) {
      throw new Error("Activity was not created")
    }
    return activity
  },
})

async function startWorkoutActivity(
  ctx: MutationCtx,
  ownerId: Id<"users">,
  args: {
    sourceKind: "workout"
    workoutId: Id<"workouts">
    experienceId: "live-workout"
    ftpAtStart: number
  },
  now: number
) {
  assertFiniteMetric(args.ftpAtStart, "ftpAtStart")
  const workout = await requireOwnedWorkout(ctx, args.workoutId, ownerId)
  const sourceSnapshot = createWorkoutSnapshot(workout, args.ftpAtStart)

  return await ctx.db.insert("activities", {
    ownerId,
    status: "in_progress",
    experienceId: args.experienceId,
    sourceKind: "workout",
    sourceWorkoutId: workout._id,
    sourceRouteId: null,
    title: workout.title,
    startedAt: now,
    updatedAt: now,
    summary: emptyWorkoutSummary(sourceSnapshot),
    sourceSnapshot,
    resumeState: {
      kind: "workout",
      elapsedSeconds: 0,
      difficultyPercent: 100,
    },
  })
}

async function startRouteActivity(
  ctx: MutationCtx,
  ownerId: Id<"users">,
  args: {
    sourceKind: "route"
    routeId: Id<"routes">
    experienceId: "route"
  },
  now: number
) {
  const route = await requireOwnedRoute(ctx, args.routeId, ownerId)
  const sourceSnapshot = createRouteSnapshot(route)

  return await ctx.db.insert("activities", {
    ownerId,
    status: "in_progress",
    experienceId: args.experienceId,
    sourceKind: "route",
    sourceWorkoutId: null,
    sourceRouteId: route._id,
    title: route.title,
    startedAt: now,
    updatedAt: now,
    summary: emptyRouteSummary(),
    sourceSnapshot,
    resumeState: {
      kind: "route",
      elapsedSeconds: 0,
      distanceMeters: 0,
      progressMode: "trainer-speed",
      smoothingLevel: 0,
    },
  })
}

export const saveProgress = mutation({
  args: {
    activityId: v.id("activities"),
    summary: activitySummaryValidator,
    resumeState: activityResumeStateValidator,
  },
  handler: async (ctx, args) => {
    const activity = await requireOwnedActivity(ctx, args.activityId)
    assertActivityStatus(activity, ["in_progress"])
    validateSummary(args.summary)
    validateResumeState(args.resumeState, activity.sourceKind)

    await ctx.db.patch(activity._id, {
      status: "in_progress",
      summary: args.summary,
      resumeState: args.resumeState,
      updatedAt: Date.now(),
    })
  },
})

export const markPending = mutation({
  args: {
    activityId: v.id("activities"),
    summary: activitySummaryValidator,
    resumeState: activityResumeStateValidator,
  },
  handler: async (ctx, args) => {
    const activity = await requireOwnedActivity(ctx, args.activityId)
    assertActivityStatus(activity, ["in_progress", "pending"])
    validateSummary(args.summary)
    validateResumeState(args.resumeState, activity.sourceKind)

    const now = Date.now()
    await ctx.db.patch(activity._id, {
      status: "pending",
      summary: args.summary,
      resumeState: args.resumeState,
      endedAt: activity.endedAt ?? now,
      updatedAt: now,
    })
  },
})

export const complete = mutation({
  args: {
    activityId: v.id("activities"),
    title: v.string(),
    summary: v.optional(activitySummaryValidator),
    resumeState: v.optional(activityResumeStateValidator),
  },
  handler: async (ctx, args) => {
    const activity = await requireOwnedActivity(ctx, args.activityId)
    assertActivityStatus(activity, ["in_progress", "pending"])

    const patch: Partial<Doc<"activities">> = {
      status: "completed",
      title: normalizeActivityTitle(args.title),
      savedAt: Date.now(),
      endedAt: activity.endedAt ?? Date.now(),
      updatedAt: Date.now(),
    }

    if (args.summary !== undefined) {
      validateSummary(args.summary)
      patch.summary = args.summary
    }
    if (args.resumeState !== undefined) {
      validateResumeState(args.resumeState, activity.sourceKind)
      patch.resumeState = args.resumeState
    }

    await ctx.db.patch(activity._id, patch)
  },
})

export const discard = mutation({
  args: { activityId: v.id("activities") },
  handler: async (ctx, args) => {
    const activity = await requireOwnedActivity(ctx, args.activityId)
    assertActivityStatus(activity, ["in_progress", "pending"])
    await ctx.db.delete(activity._id)
  },
})
