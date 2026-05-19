import { getAuthUserId } from "@convex-dev/auth/server"
import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"

type Ctx = QueryCtx | MutationCtx

export async function requireAuthUserId(ctx: Ctx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new Error("Not authenticated")
  }
  return userId
}

export function isBootstrapAdminEmail(email: string | undefined): boolean {
  if (!email) {
    return false
  }

  const bootstrapEmails = process.env.BOOTSTRAP_ADMIN_EMAILS ?? ""
  const normalizedEmail = email.trim().toLowerCase()
  return bootstrapEmails
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalizedEmail)
}

export function isAdminUser(user: Pick<Doc<"users">, "email" | "role">) {
  return user.role === "admin" || isBootstrapAdminEmail(user.email)
}

export async function requireAdminUserId(ctx: Ctx): Promise<Id<"users">> {
  const userId = await requireAuthUserId(ctx)
  const user = await ctx.db.get(userId)
  if (!user || !isAdminUser(user)) {
    throw new Error("Unauthorized")
  }
  return userId
}

export function assertOwned(
  doc: { ownerId: Id<"users"> },
  userId: Id<"users">
) {
  if (doc.ownerId !== userId) {
    throw new Error("Unauthorized")
  }
}

export async function requireOwnedWorkout(
  ctx: Ctx,
  workoutId: Id<"workouts">,
  userId?: Id<"users">
): Promise<Doc<"workouts">> {
  const ownerId = userId ?? (await requireAuthUserId(ctx))
  const workout = await ctx.db.get(workoutId)
  if (!workout) {
    throw new Error("Not found")
  }
  assertOwned(workout, ownerId)
  return workout
}

export async function requireOwnedPlan(
  ctx: Ctx,
  planId: Id<"plans">,
  userId?: Id<"users">
): Promise<Doc<"plans">> {
  const ownerId = userId ?? (await requireAuthUserId(ctx))
  const plan = await ctx.db.get(planId)
  if (!plan) {
    throw new Error("Not found")
  }
  assertOwned(plan, ownerId)
  return plan
}

export async function requireOwnedRoute(
  ctx: Ctx,
  routeId: Id<"routes">,
  userId?: Id<"users">
): Promise<Doc<"routes">> {
  const ownerId = userId ?? (await requireAuthUserId(ctx))
  const route = await ctx.db.get(routeId)
  if (!route) {
    throw new Error("Not found")
  }
  assertOwned(route, ownerId)
  return route
}

export async function requireOwnedWeek(
  ctx: Ctx,
  weekId: Id<"planWeeks">,
  userId?: Id<"users">
): Promise<{ week: Doc<"planWeeks">; plan: Doc<"plans"> }> {
  // Plan child rows do not duplicate ownerId; all planWeeks and
  // planWeekWorkouts access must be authorized through the parent plan.
  const week = await ctx.db.get(weekId)
  if (!week) {
    throw new Error("Not found")
  }
  const plan = await requireOwnedPlan(ctx, week.planId, userId)
  return { week, plan }
}
