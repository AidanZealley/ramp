import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import {
  assertOwned,
  requireAuthUserId,
  requireOwnedRoute,
} from "./authHelpers"
import {
  routeSegmentInputValidator,
  validateGeneratedRouteSegments,
} from "./routeSegmentValidators"

export const listByRoute = query({
  args: { routeId: v.id("routes") },
  handler: async (ctx, args) => {
    const ownerId = await requireAuthUserId(ctx)
    await requireOwnedRoute(ctx, args.routeId, ownerId)

    return await ctx.db
      .query("routeSegments")
      .withIndex("by_routeId_and_startDistanceMeters", (q) =>
        q.eq("routeId", args.routeId)
      )
      .collect()
  },
})

export const replaceForRoute = mutation({
  args: {
    routeId: v.id("routes"),
    segments: v.array(routeSegmentInputValidator),
  },
  handler: async (ctx, args) => {
    const ownerId = await requireAuthUserId(ctx)
    await requireOwnedRoute(ctx, args.routeId, ownerId)
    validateGeneratedRouteSegments(args.segments)

    const existingSegments = await ctx.db
      .query("routeSegments")
      .withIndex("by_routeId_and_startDistanceMeters", (q) =>
        q.eq("routeId", args.routeId)
      )
      .collect()

    for (const segment of existingSegments) {
      await ctx.db.delete(segment._id)
    }

    const generatedAt = Date.now()
    for (const segment of args.segments) {
      await ctx.db.insert("routeSegments", {
        ...segment,
        ownerId,
        routeId: args.routeId,
        source: "generated",
        generatedAt,
      })
    }
  },
})

export const deleteOne = mutation({
  args: { segmentId: v.id("routeSegments") },
  handler: async (ctx, args) => {
    const ownerId = await requireAuthUserId(ctx)
    const segment = await ctx.db.get(args.segmentId)
    if (!segment) {
      throw new Error("Not found")
    }
    assertOwned(segment, ownerId)

    await ctx.db.delete(args.segmentId)
  },
})
