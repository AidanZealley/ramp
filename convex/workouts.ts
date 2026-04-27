import { internal } from "./_generated/api"
import { query, mutation, internalMutation } from "./_generated/server"
import { v } from "convex/values"

const intervalValidator = v.object({
  startPower: v.number(),
  endPower: v.number(),
  durationSeconds: v.number(),
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("workouts").collect()
  },
})

export const get = query({
  args: { id: v.id("workouts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const create = mutation({
  args: {
    title: v.string(),
    powerMode: v.union(v.literal("absolute"), v.literal("percentage")),
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
    powerMode: v.union(v.literal("absolute"), v.literal("percentage")),
    intervals: v.array(intervalValidator),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args
    await ctx.db.patch(id, data)
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
