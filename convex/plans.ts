import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"

type PlanDoc = Doc<"plans">
type PlanWeekDoc = Doc<"planWeeks">
type PlanWeekWorkoutDoc = Doc<"planWeekWorkouts">
type WorkoutDoc = Doc<"workouts">
type WorkoutIdOrNull = Id<"workouts"> | null

const DAYS_PER_WEEK = 7

function getTotalDuration(intervals: WorkoutDoc["intervals"]): number {
  return intervals.reduce((sum, interval) => sum + interval.durationSeconds, 0)
}

function slotDayIndex(slot: PlanWeekWorkoutDoc): number {
  return slot.dayIndex ?? slot.orderIndex ?? 0
}

async function getPlanWeeks(
  ctx: QueryCtx | MutationCtx,
  planId: Id<"plans">
): Promise<PlanWeekDoc[]> {
  return await ctx.db
    .query("planWeeks")
    .withIndex("by_plan_and_order", (q) => q.eq("planId", planId))
    .collect()
}

async function getWeekSlots(
  ctx: QueryCtx | MutationCtx,
  weekId: Id<"planWeeks">
): Promise<PlanWeekWorkoutDoc[]> {
  const slots = await ctx.db
    .query("planWeekWorkouts")
    .withIndex("by_week_and_day", (q) => q.eq("weekId", weekId))
    .collect()

  return slots.sort((a, b) => slotDayIndex(a) - slotDayIndex(b))
}

async function seedEmptyWeekSlots(
  ctx: MutationCtx,
  weekId: Id<"planWeeks">
): Promise<void> {
  for (let dayIndex = 0; dayIndex < DAYS_PER_WEEK; dayIndex += 1) {
    await ctx.db.insert("planWeekWorkouts", {
      weekId,
      dayIndex,
      workoutId: null,
    })
  }
}

async function normalizeWeekSlots(
  ctx: MutationCtx,
  weekId: Id<"planWeeks">
): Promise<void> {
  const existingSlots = await getWeekSlots(ctx, weekId)
  const firstSlotByDay = new Map<number, PlanWeekWorkoutDoc>()
  const overflowSlots: PlanWeekWorkoutDoc[] = []

  for (const slot of existingSlots) {
    const dayIndex = slotDayIndex(slot)
    if (
      dayIndex >= 0 &&
      dayIndex < DAYS_PER_WEEK &&
      !firstSlotByDay.has(dayIndex)
    ) {
      firstSlotByDay.set(dayIndex, slot)
    } else {
      overflowSlots.push(slot)
    }
  }

  for (let dayIndex = 0; dayIndex < DAYS_PER_WEEK; dayIndex += 1) {
    const slot = firstSlotByDay.get(dayIndex)
    if (slot) {
      await ctx.db.patch(slot._id, {
        dayIndex,
      })
    } else {
      await ctx.db.insert("planWeekWorkouts", {
        weekId,
        dayIndex,
        workoutId: null,
      })
    }
  }

  await Promise.all(overflowSlots.map((slot) => ctx.db.delete(slot._id)))
}

async function getWorkoutMap(
  ctx: QueryCtx | MutationCtx,
  workoutIds: WorkoutIdOrNull[]
): Promise<Map<Id<"workouts">, WorkoutDoc>> {
  const uniqueWorkoutIds = Array.from(
    new Set(
      workoutIds.filter(
        (workoutId): workoutId is Id<"workouts"> => workoutId !== null
      )
    )
  )
  const workouts = await Promise.all(
    uniqueWorkoutIds.map(async (workoutId) => ({
      workoutId,
      workout: await ctx.db.get(workoutId),
    }))
  )

  return new Map(
    workouts.flatMap(({ workoutId, workout }) =>
      workout ? [[workoutId, workout] as const] : []
    )
  )
}

function fixedWeekSlots(
  slots: PlanWeekWorkoutDoc[],
  workoutMap: Map<Id<"workouts">, WorkoutDoc>
): Array<PlanWeekWorkoutDoc & { workout: WorkoutDoc | null }> {
  const slotsByDay = new Map<number, PlanWeekWorkoutDoc>()
  for (const slot of slots) {
    const dayIndex = slotDayIndex(slot)
    if (
      dayIndex >= 0 &&
      dayIndex < DAYS_PER_WEEK &&
      !slotsByDay.has(dayIndex)
    ) {
      slotsByDay.set(dayIndex, slot)
    }
  }

  return Array.from({ length: DAYS_PER_WEEK }, (_, dayIndex) => {
    const slot = slotsByDay.get(dayIndex)
    if (slot) {
      return {
        ...slot,
        dayIndex,
        workout: slot.workoutId
          ? (workoutMap.get(slot.workoutId) ?? null)
          : null,
      }
    }

    return {
      _id: `missing:${dayIndex}` as Id<"planWeekWorkouts">,
      _creationTime: 0,
      weekId: "" as Id<"planWeeks">,
      dayIndex,
      workoutId: null,
      workout: null,
    }
  })
}

async function getPlanTree(
  ctx: QueryCtx | MutationCtx,
  planId: Id<"plans">
): Promise<{
  plan: PlanDoc | null
  weeks: Array<
    PlanWeekDoc & {
      slots: Array<PlanWeekWorkoutDoc & { workout: WorkoutDoc | null }>
    }
  >
}> {
  const plan = await ctx.db.get(planId)
  if (!plan) {
    return { plan: null, weeks: [] }
  }

  const weeks = await getPlanWeeks(ctx, planId)
  const weekSlots = await Promise.all(
    weeks.map(async (week) => ({
      week,
      slots: await getWeekSlots(ctx, week._id),
    }))
  )
  const workoutMap = await getWorkoutMap(
    ctx,
    weekSlots.flatMap(({ slots }) => slots.map((slot) => slot.workoutId))
  )

  return {
    plan,
    weeks: weekSlots.map(({ week, slots }) => ({
      ...week,
      slots: fixedWeekSlots(slots, workoutMap).map((slot) => ({
        ...slot,
        weekId: week._id,
      })),
    })),
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.db.query("plans").collect()

    return await Promise.all(
      plans.map(async (plan) => {
        const weeks = await getPlanWeeks(ctx, plan._id)
        const allSlots = await Promise.all(
          weeks.map((week) => getWeekSlots(ctx, week._id))
        )
        const workoutMap = await getWorkoutMap(
          ctx,
          allSlots.flatMap((slots) => slots.map((slot) => slot.workoutId))
        )

        let totalWorkouts = 0
        let totalDurationSeconds = 0

        for (const slots of allSlots) {
          for (const slot of fixedWeekSlots(slots, workoutMap)) {
            if (!slot.workout) continue
            totalWorkouts += 1
            totalDurationSeconds += getTotalDuration(slot.workout.intervals)
          }
        }

        return {
          ...plan,
          weekCount: weeks.length,
          totalWorkouts,
          totalDurationSeconds,
        }
      })
    )
  },
})

export const get = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    const tree = await getPlanTree(ctx, args.planId)
    if (!tree.plan) {
      return null
    }

    return {
      ...tree.plan,
      weeks: tree.weeks,
    }
  },
})

export const migrateWeekSchedules = mutation({
  args: { planId: v.optional(v.id("plans")) },
  handler: async (ctx, args) => {
    const weeks = args.planId
      ? await getPlanWeeks(ctx, args.planId)
      : await ctx.db.query("planWeeks").collect()

    for (const week of weeks) {
      await normalizeWeekSlots(ctx, week._id)
    }

    return { weeksMigrated: weeks.length }
  },
})

export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const planId = await ctx.db.insert("plans", {
      title: args.title,
    })
    const weekId = await ctx.db.insert("planWeeks", {
      planId,
      orderIndex: 0,
    })
    await seedEmptyWeekSlots(ctx, weekId)
    return planId
  },
})

export const updateTitle = mutation({
  args: {
    planId: v.id("plans"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.planId, {
      title: args.title,
    })
  },
})

export const remove = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    const weeks = await getPlanWeeks(ctx, args.planId)
    for (const week of weeks) {
      const slots = await getWeekSlots(ctx, week._id)
      for (const slot of slots) {
        await ctx.db.delete(slot._id)
      }
      await ctx.db.delete(week._id)
    }
    await ctx.db.delete(args.planId)
  },
})

export const duplicatePlan = mutation({
  args: {
    planId: v.id("plans"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tree = await getPlanTree(ctx, args.planId)
    if (!tree.plan) {
      throw new Error("Plan not found")
    }

    const newPlanId = await ctx.db.insert("plans", {
      title: args.title ?? `${tree.plan.title} (copy)`,
    })

    for (const week of tree.weeks) {
      const newWeekId = await ctx.db.insert("planWeeks", {
        planId: newPlanId,
        orderIndex: week.orderIndex,
      })
      for (let dayIndex = 0; dayIndex < DAYS_PER_WEEK; dayIndex += 1) {
        await ctx.db.insert("planWeekWorkouts", {
          weekId: newWeekId,
          dayIndex,
          workoutId: week.slots[dayIndex]?.workoutId ?? null,
        })
      }
    }

    return newPlanId
  },
})

export const addWeek = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    const lastWeek = await ctx.db
      .query("planWeeks")
      .withIndex("by_plan_and_order", (q) => q.eq("planId", args.planId))
      .order("desc")
      .take(1)

    const weekId = await ctx.db.insert("planWeeks", {
      planId: args.planId,
      orderIndex: (lastWeek[0]?.orderIndex ?? -1) + 1,
    })
    await seedEmptyWeekSlots(ctx, weekId)
    return weekId
  },
})

async function renumberPlanWeeks(
  ctx: MutationCtx,
  planId: Id<"plans">
): Promise<void> {
  const weeks = await getPlanWeeks(ctx, planId)
  await Promise.all(
    weeks.map((week, index) =>
      ctx.db.patch(week._id, {
        orderIndex: index,
      })
    )
  )
}

export const removeWeek = mutation({
  args: { weekId: v.id("planWeeks") },
  handler: async (ctx, args) => {
    const week = await ctx.db.get(args.weekId)
    if (!week) {
      return
    }

    const slots = await getWeekSlots(ctx, week._id)
    await Promise.all(slots.map((slot) => ctx.db.delete(slot._id)))
    await ctx.db.delete(week._id)
    await renumberPlanWeeks(ctx, week.planId)
  },
})

export const updateWeekSchedule = mutation({
  args: {
    weekId: v.id("planWeeks"),
    workoutIdsByDay: v.array(v.union(v.id("workouts"), v.null())),
  },
  handler: async (ctx, args) => {
    if (args.workoutIdsByDay.length !== DAYS_PER_WEEK) {
      throw new Error("Week schedule must contain exactly 7 days")
    }

    await normalizeWeekSlots(ctx, args.weekId)
    const slots = await getWeekSlots(ctx, args.weekId)

    for (let dayIndex = 0; dayIndex < DAYS_PER_WEEK; dayIndex += 1) {
      const slot = slots.find(
        (currentSlot) => slotDayIndex(currentSlot) === dayIndex
      )
      if (!slot) {
        await ctx.db.insert("planWeekWorkouts", {
          weekId: args.weekId,
          dayIndex,
          workoutId: args.workoutIdsByDay[dayIndex],
        })
        continue
      }

      await ctx.db.patch(slot._id, {
        dayIndex,
        workoutId: args.workoutIdsByDay[dayIndex],
      })
    }
  },
})
