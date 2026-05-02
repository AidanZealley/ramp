import { ConvexError, v } from "convex/values"
import { internal } from "./_generated/api"
import { internalMutation, mutation, query } from "./_generated/server"
import { computeWorkoutSummary } from "./workoutSummary"
import type { MutationCtx } from "./_generated/server"
import type { Doc } from "./_generated/dataModel"

const intervalValidator = v.object({
  startPower: v.number(),
  endPower: v.number(),
  durationSeconds: v.number(),
  comment: v.optional(v.string()),
})

const MAX_INTERVAL_COMMENT_LENGTH = 240
const MAX_WORKOUT_DURATION_SECONDS = 24 * 60 * 60
const MAX_WORKOUT_POWER_PERCENT = 300
const LEGACY_POWER_MODE_BATCH_SIZE = 200
const WORKOUT_SUMMARY_BACKFILL_BATCH_SIZE = 200
const INTERVALS_REVISION_BACKFILL_BATCH_SIZE = 200

type WorkoutDoc = Doc<"workouts">

type WorkoutIntervalInput = {
  startPower: number
  endPower: number
  durationSeconds: number
  comment?: string
}

export type IntervalsConflictErrorData = {
  kind: "intervalsRevisionConflict"
  currentIntervalsRevision: number
}

export function resolveIntervalsRevision(
  workout: Pick<WorkoutDoc, "intervalsRevision">
) {
  return workout.intervalsRevision ?? 0
}

export function sanitizeWorkoutForClient(workout: WorkoutDoc) {
  const { powerMode: _powerMode, intervalsRevision, ...rest } = workout
  return {
    ...rest,
    intervalsRevision: intervalsRevision ?? 0,
  }
}

export function normalizeWorkoutTitle(title: string): string {
  const normalized = title.replace(/\s+/g, " ").trim()
  if (!normalized) {
    throw new Error("Workout title must not be empty")
  }
  return normalized
}

function normalizeIntervalComment(comment: string): string {
  return comment
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_INTERVAL_COMMENT_LENGTH)
}

function assertFiniteIntegerInRange(
  value: number,
  min: number,
  max: number,
  label: string
) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`)
  }
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`)
  }
  if (value < min || value > max) {
    throw new Error(`${label} must be between ${min} and ${max}`)
  }
}

function assertFiniteNumberInRange(
  value: number,
  min: number,
  max: number,
  label: string
) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`)
  }
  if (value < min || value > max) {
    throw new Error(`${label} must be between ${min} and ${max}`)
  }
}

export function normalizeIntervalsForStorage(
  intervals: Array<WorkoutIntervalInput>
) {
  return intervals.map((interval, index) => {
    assertFiniteNumberInRange(
      interval.startPower,
      0,
      MAX_WORKOUT_POWER_PERCENT,
      `intervals[${index}].startPower`
    )
    assertFiniteNumberInRange(
      interval.endPower,
      0,
      MAX_WORKOUT_POWER_PERCENT,
      `intervals[${index}].endPower`
    )
    assertFiniteIntegerInRange(
      interval.durationSeconds,
      0,
      MAX_WORKOUT_DURATION_SECONDS,
      `intervals[${index}].durationSeconds`
    )
    const durationSeconds = interval.durationSeconds

    const comment =
      interval.comment === undefined
        ? ""
        : normalizeIntervalComment(interval.comment)
    if (!comment) {
      const { comment: _comment, ...rest } = interval
      return { ...rest, durationSeconds }
    }
    return { ...interval, durationSeconds, comment }
  })
}

export function createIntervalsConflictErrorData(
  currentIntervalsRevision: number
): IntervalsConflictErrorData {
  return {
    kind: "intervalsRevisionConflict",
    currentIntervalsRevision,
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const workouts = await ctx.db.query("workouts").collect()
    return workouts.map(sanitizeWorkoutForClient)
  },
})

export const get = query({
  args: { id: v.id("workouts") },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.id)
    return workout ? sanitizeWorkoutForClient(workout) : null
  },
})

export const create = mutation({
  args: {
    title: v.string(),
    intervals: v.array(intervalValidator),
  },
  handler: async (ctx, args) => {
    const title = normalizeWorkoutTitle(args.title)
    const intervals = normalizeIntervalsForStorage(args.intervals)
    return await ctx.db.insert("workouts", {
      title,
      intervals,
      intervalsRevision: 0,
      summary: computeWorkoutSummary(intervals),
    })
  },
})

export const updateIntervals = mutation({
  args: {
    id: v.id("workouts"),
    intervals: v.array(intervalValidator),
    expectedIntervalsRevision: v.number(),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.id)
    if (!workout) {
      throw new Error("Workout not found")
    }

    const currentIntervalsRevision = resolveIntervalsRevision(workout)
    if (
      args.force !== true &&
      args.expectedIntervalsRevision !== currentIntervalsRevision
    ) {
      throw new ConvexError(
        createIntervalsConflictErrorData(currentIntervalsRevision)
      )
    }

    const intervals = normalizeIntervalsForStorage(args.intervals)

    await ctx.db.patch(args.id, {
      intervals,
      intervalsRevision: currentIntervalsRevision + 1,
      summary: computeWorkoutSummary(intervals),
    })
  },
})

export const updateTitle = mutation({
  args: {
    id: v.id("workouts"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { title: normalizeWorkoutTitle(args.title) })
  },
})

export const duplicateWorkout = mutation({
  args: {
    id: v.id("workouts"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.id)
    if (!workout) {
      throw new Error("Workout not found")
    }

    const title = normalizeWorkoutTitle(args.title ?? `${workout.title} (copy)`)
    return await ctx.db.insert("workouts", {
      title,
      intervals: workout.intervals,
      intervalsRevision: 0,
      summary: computeWorkoutSummary(workout.intervals),
    })
  },
})

export const remove = mutation({
  args: { id: v.id("workouts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    const referencedSlots = await ctx.db
      .query("planWeekWorkouts")
      .withIndex("by_workout", (q) => q.eq("workoutId", args.id))
      .take(201)

    if (referencedSlots.length === 0) {
      return
    }

    const firstBatch = referencedSlots.slice(0, 200)
    await Promise.all(
      firstBatch.map((slot) => ctx.db.patch(slot._id, { workoutId: null }))
    )

    if (referencedSlots.length > 200) {
      await ctx.scheduler.runAfter(
        0,
        internal.workouts.continueRemoveWorkoutReferences,
        { workoutId: args.id }
      )
    }
  },
})

export const continueRemoveWorkoutReferences = internalMutation({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, args) => {
    const referencedSlots = await ctx.db
      .query("planWeekWorkouts")
      .withIndex("by_workout", (q) => q.eq("workoutId", args.workoutId))
      .take(201)

    if (referencedSlots.length === 0) {
      return
    }

    const batch = referencedSlots.slice(0, 200)
    await Promise.all(
      batch.map((slot) => ctx.db.patch(slot._id, { workoutId: null }))
    )

    if (referencedSlots.length > 200) {
      await ctx.scheduler.runAfter(
        0,
        internal.workouts.continueRemoveWorkoutReferences,
        { workoutId: args.workoutId }
      )
    }
  },
})

export const migrateAbsoluteWorkoutsToPercentage = mutation({
  args: {},
  handler: async (ctx) => {
    const status = await runWorkoutPowerMigrationBatch(ctx)

    if (status.hasMore) {
      await ctx.scheduler.runAfter(
        0,
        internal.workouts.continueMigrateAbsoluteWorkoutsToPercentage,
        {}
      )
    }

    return status
  },
})

export const continueMigrateAbsoluteWorkoutsToPercentage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const status = await runWorkoutPowerMigrationBatch(ctx)

    if (status.hasMore) {
      await ctx.scheduler.runAfter(
        0,
        internal.workouts.continueMigrateAbsoluteWorkoutsToPercentage,
        {}
      )
    }

    return status
  },
})

export const backfillWorkoutSummaries = mutation({
  args: {},
  handler: async (ctx) => {
    const status = await runWorkoutSummaryBackfillBatch(ctx, null)

    if (status.hasMore) {
      await ctx.scheduler.runAfter(
        0,
        internal.workouts.continueBackfillWorkoutSummaries,
        { cursor: status.continueCursor }
      )
    }

    return status
  },
})

export const backfillWorkoutIntervalsRevision = mutation({
  args: {},
  handler: async (ctx) => {
    const status = await runWorkoutIntervalsRevisionBackfillBatch(ctx, null)

    if (status.hasMore) {
      await ctx.scheduler.runAfter(
        0,
        internal.workouts.continueBackfillWorkoutIntervalsRevision,
        { cursor: status.continueCursor }
      )
    }

    return status
  },
})

export const continueBackfillWorkoutIntervalsRevision = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const status = await runWorkoutIntervalsRevisionBackfillBatch(
      ctx,
      args.cursor
    )

    if (status.hasMore) {
      await ctx.scheduler.runAfter(
        0,
        internal.workouts.continueBackfillWorkoutIntervalsRevision,
        { cursor: status.continueCursor }
      )
    }

    return status
  },
})

export const continueBackfillWorkoutSummaries = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const status = await runWorkoutSummaryBackfillBatch(ctx, args.cursor)

    if (status.hasMore) {
      await ctx.scheduler.runAfter(
        0,
        internal.workouts.continueBackfillWorkoutSummaries,
        { cursor: status.continueCursor }
      )
    }

    return status
  },
})

async function runWorkoutPowerMigrationBatch(ctx: MutationCtx) {
  const settings = await ctx.db.query("userSettings").first()
  const ftp = settings?.ftp ?? 150

  const absoluteWorkouts = await ctx.db
    .query("workouts")
    .filter((q) => q.eq(q.field("powerMode"), "absolute"))
    .take(LEGACY_POWER_MODE_BATCH_SIZE + 1)

  const absoluteBatch = absoluteWorkouts.slice(0, LEGACY_POWER_MODE_BATCH_SIZE)

  await Promise.all(
    absoluteBatch.map((workout) => {
      const intervals = workout.intervals.map((interval) => ({
        ...interval,
        startPower: Math.round((interval.startPower / ftp) * 100),
        endPower: Math.round((interval.endPower / ftp) * 100),
      }))

      return ctx.db.replace(workout._id, {
        title: workout.title,
        intervalsRevision: resolveIntervalsRevision(workout),
        intervals,
        summary: computeWorkoutSummary(intervals),
      })
    })
  )

  const legacyPercentageWorkouts =
    absoluteBatch.length === LEGACY_POWER_MODE_BATCH_SIZE
      ? []
      : await ctx.db
          .query("workouts")
          .filter((q) => q.eq(q.field("powerMode"), "percentage"))
          .take(LEGACY_POWER_MODE_BATCH_SIZE + 1)

  const percentageBatch = legacyPercentageWorkouts.slice(
    0,
    LEGACY_POWER_MODE_BATCH_SIZE
  )

  await Promise.all(
    percentageBatch.map((workout) =>
      ctx.db.replace(workout._id, {
        title: workout.title,
        intervalsRevision: resolveIntervalsRevision(workout),
        intervals: workout.intervals,
        summary: computeWorkoutSummary(workout.intervals),
      })
    )
  )

  return {
    processedAbsolute: absoluteBatch.length,
    processedPercentage: percentageBatch.length,
    hasMore:
      absoluteWorkouts.length > LEGACY_POWER_MODE_BATCH_SIZE ||
      legacyPercentageWorkouts.length > LEGACY_POWER_MODE_BATCH_SIZE,
  }
}

async function runWorkoutSummaryBackfillBatch(
  ctx: MutationCtx,
  cursor: string | null
) {
  const page = await ctx.db.query("workouts").order("asc").paginate({
    cursor,
    numItems: WORKOUT_SUMMARY_BACKFILL_BATCH_SIZE,
  })

  const workoutsToPatch = page.page.filter(
    (workout) => workout.summary === undefined
  )

  await Promise.all(
    workoutsToPatch.map((workout) =>
      ctx.db.patch(workout._id, {
        summary: computeWorkoutSummary(workout.intervals),
      })
    )
  )

  return {
    scanned: page.page.length,
    updated: workoutsToPatch.length,
    continueCursor: page.continueCursor,
    hasMore: !page.isDone,
  }
}

async function runWorkoutIntervalsRevisionBackfillBatch(
  ctx: MutationCtx,
  cursor: string | null
) {
  const page = await ctx.db.query("workouts").order("asc").paginate({
    cursor,
    numItems: INTERVALS_REVISION_BACKFILL_BATCH_SIZE,
  })

  const workoutsToPatch = page.page.filter(
    (workout) => workout.intervalsRevision === undefined
  )

  await Promise.all(
    workoutsToPatch.map((workout) =>
      ctx.db.patch(workout._id, {
        intervalsRevision: 0,
      })
    )
  )

  return {
    scanned: page.page.length,
    updated: workoutsToPatch.length,
    continueCursor: page.continueCursor,
    hasMore: !page.isDone,
  }
}
