import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { handleLinkedUnresolvedActivityForSource } from "./activities"
import { requireAuthUserId, requireOwnedRoute } from "./authHelpers"
import {
  routeSegmentInputValidator,
  validateGeneratedRouteSegments,
} from "./routeSegmentValidators"

const routeStatsValidator = v.object({
  distanceMeters: v.number(),
  elevationGainMeters: v.number(),
  elevationLossMeters: v.number(),
  minElevationMeters: v.union(v.number(), v.null()),
  maxElevationMeters: v.union(v.number(), v.null()),
  pointCount: v.number(),
})

const routeBoundsValidator = v.union(
  v.object({
    minLat: v.number(),
    minLng: v.number(),
    maxLat: v.number(),
    maxLng: v.number(),
  }),
  v.null()
)

const routePositionValidator = v.union(
  v.object({ lat: v.number(), lng: v.number() }),
  v.null()
)

const routePreviewPointValidator = v.object({
  x: v.number(),
  y: v.number(),
})

export function normalizeRouteTitle(title: string): string {
  const normalized = title.replace(/\s+/g, " ").trim()
  if (!normalized) {
    throw new Error("Route title must not be empty")
  }
  return normalized.slice(0, 120)
}

function assertFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`)
  }
}

export function validatePreviewPoints(
  previewPoints: Array<{ x: number; y: number }>
) {
  if (previewPoints.length > 80) {
    throw new Error("previewPoints must contain at most 80 points")
  }

  for (const [index, point] of previewPoints.entries()) {
    assertFiniteNumber(point.x, `previewPoints[${index}].x`)
    assertFiniteNumber(point.y, `previewPoints[${index}].y`)
    if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
      throw new Error("previewPoints must be normalized between 0 and 1")
    }
  }

  return previewPoints
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuthUserId(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const createFromGpxUpload = mutation({
  args: {
    title: v.string(),
    fileStorageId: v.id("_storage"),
    originalFileName: v.string(),
    contentType: v.string(),
    fileSizeBytes: v.number(),
    stats: routeStatsValidator,
    bounds: routeBoundsValidator,
    start: routePositionValidator,
    finish: routePositionValidator,
    previewPoints: v.array(routePreviewPointValidator),
    tags: v.optional(v.array(v.string())),
    segments: v.optional(v.array(routeSegmentInputValidator)),
  },
  handler: async (ctx, args) => {
    const ownerId = await requireAuthUserId(ctx)
    const title = normalizeRouteTitle(args.title)
    validatePreviewPoints(args.previewPoints)
    const segments = validateGeneratedRouteSegments(args.segments ?? [])

    const routeId = await ctx.db.insert("routes", {
      ownerId,
      title,
      source: "gpx",
      fileStorageId: args.fileStorageId,
      originalFileName: args.originalFileName,
      contentType: args.contentType || "application/gpx+xml",
      fileSizeBytes: args.fileSizeBytes,
      stats: args.stats,
      bounds: args.bounds,
      start: args.start,
      finish: args.finish,
      previewPoints: args.previewPoints,
      tags: args.tags,
    })

    const generatedAt = Date.now()
    for (const segment of segments) {
      await ctx.db.insert("routeSegments", {
        ...segment,
        ownerId,
        routeId,
        source: "generated",
        generatedAt,
      })
    }

    return routeId
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireAuthUserId(ctx)
    const routes = await ctx.db
      .query("routes")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
      .collect()
    return routes.sort((a, b) => b._creationTime - a._creationTime)
  },
})

export const get = query({
  args: { id: v.id("routes") },
  handler: async (ctx, args) => {
    const ownerId = await requireAuthUserId(ctx)
    const routeDoc = await ctx.db.get(args.id)
    if (!routeDoc || routeDoc.ownerId !== ownerId) return null

    return {
      ...routeDoc,
      fileUrl: await ctx.storage.getUrl(routeDoc.fileStorageId),
    }
  },
})

export const remove = mutation({
  args: {
    id: v.id("routes"),
    deleteLinkedUnresolvedActivity: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const routeDoc = await requireOwnedRoute(ctx, args.id)
    await handleLinkedUnresolvedActivityForSource(ctx, {
      ownerId: routeDoc.ownerId,
      sourceKind: "route",
      sourceId: args.id,
      deleteLinkedUnresolvedActivity: args.deleteLinkedUnresolvedActivity,
    })

    const routeSegments = await ctx.db
      .query("routeSegments")
      .withIndex("by_routeId_and_startDistanceMeters", (q) =>
        q.eq("routeId", args.id)
      )
      .collect()
    for (const segment of routeSegments) {
      await ctx.db.delete(segment._id)
    }

    await ctx.storage.delete(routeDoc.fileStorageId)
    await ctx.db.delete(args.id)
  },
})

export const updateTitle = mutation({
  args: {
    id: v.id("routes"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOwnedRoute(ctx, args.id)

    await ctx.db.patch(args.id, {
      title: normalizeRouteTitle(args.title),
    })
  },
})
