import { internal } from "./_generated/api"
import type { Doc } from "./_generated/dataModel"
import {
  query,
  mutation,
  internalMutation,
  type MutationCtx,
} from "./_generated/server"
import { v } from "convex/values"

const intervalValidator = v.object({
  startPower: v.number(),
  endPower: v.number(),
  durationSeconds: v.number(),
})

const LEGACY_POWER_MODE_BATCH_SIZE = 200

type WorkoutDoc = Doc<"workouts">

function sanitizeWorkout(workout: WorkoutDoc) {
  const { powerMode: _powerMode, ...rest } = workout
  return rest
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const workouts = await ctx.db.query("workouts").collect()
    return workouts.map(sanitizeWorkout)
  },
})

export const get = query({
  args: { id: v.id("workouts") },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.id)
    return workout ? sanitizeWorkout(workout) : null
  },
})

export const create = mutation({
  args: {
    title: v.string(),
    intervals: v.array(intervalValidator),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workouts", args)
  },
})

export const update = mutation({
  args: {
    id: v.id("workouts"),
    title: v.string(),
    intervals: v.array(intervalValidator),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args
    await ctx.db.replace(id, data)
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

async function runWorkoutPowerMigrationBatch(ctx: MutationCtx) {
  const settings = await ctx.db.query("userSettings").first()
  const ftp = settings?.ftp ?? 150

  const absoluteWorkouts = await ctx.db
    .query("workouts")
    .filter((q) => q.eq(q.field("powerMode"), "absolute"))
    .take(LEGACY_POWER_MODE_BATCH_SIZE + 1)

  const absoluteBatch = absoluteWorkouts.slice(0, LEGACY_POWER_MODE_BATCH_SIZE)

  await Promise.all(
    absoluteBatch.map((workout) =>
      ctx.db.replace(workout._id, {
        title: workout.title,
        intervals: workout.intervals.map((interval) => ({
          ...interval,
          startPower: Math.round((interval.startPower / ftp) * 100),
          endPower: Math.round((interval.endPower / ftp) * 100),
        })),
      })
    )
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
        intervals: workout.intervals,
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
