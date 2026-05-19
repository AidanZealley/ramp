import { describe, expect, it, vi } from "vitest"
import {
  assertOwned,
  requireOwnedPlan,
  requireOwnedRoute,
  requireOwnedWeek,
  requireOwnedWorkout,
} from "./authHelpers"
import type { Doc, Id } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"

const user1 = "user-1" as Id<"users">
const user2 = "user-2" as Id<"users">
const workoutId = "workout-1" as Id<"workouts">
const planId = "plan-1" as Id<"plans">
const routeId = "route-1" as Id<"routes">
const weekId = "week-1" as Id<"planWeeks">

function createCtxWithDoc<TDoc>(doc: TDoc | null) {
  return {
    db: {
      get: vi.fn().mockResolvedValue(doc),
    },
  } as unknown as QueryCtx
}

function createCtxWithDocs(docs: Array<unknown>) {
  const get = vi.fn()
  for (const doc of docs) {
    get.mockResolvedValueOnce(doc)
  }
  return {
    db: {
      get,
    },
  } as unknown as QueryCtx
}

function createWorkout(ownerId: Id<"users">): Doc<"workouts"> {
  return {
    _id: workoutId,
    _creationTime: 1,
    ownerId,
    title: "Ramp Builder",
    intervals: [
      {
        startPower: 150,
        endPower: 250,
        durationSeconds: 300,
      },
    ],
  }
}

function createPlan(ownerId: Id<"users">): Doc<"plans"> {
  return {
    _id: planId,
    _creationTime: 1,
    ownerId,
    title: "Base Plan",
  }
}

function createRoute(ownerId: Id<"users">): Doc<"routes"> {
  return {
    _id: routeId,
    _creationTime: 1,
    ownerId,
    title: "Loop",
    source: "gpx",
    fileStorageId: "storage-1" as Id<"_storage">,
    originalFileName: "loop.gpx",
    contentType: "application/gpx+xml",
    fileSizeBytes: 123,
    stats: {
      distanceMeters: 1000,
      elevationGainMeters: 20,
      elevationLossMeters: 20,
      minElevationMeters: 10,
      maxElevationMeters: 30,
      pointCount: 10,
    },
    bounds: null,
    start: null,
    finish: null,
    previewPoints: [],
  }
}

function createWeek(): Doc<"planWeeks"> {
  return {
    _id: weekId,
    _creationTime: 1,
    planId,
    orderIndex: 0,
  }
}

describe("auth helpers", () => {
  it("accepts documents owned by the current user", () => {
    expect(() => assertOwned({ ownerId: user1 }, user1)).not.toThrow()
  })

  it("rejects documents owned by a different user", () => {
    expect(() => assertOwned({ ownerId: user2 }, user1)).toThrow(
      "Unauthorized"
    )
  })

  it("returns an owned workout", async () => {
    const workout = createWorkout(user1)
    const ctx = createCtxWithDoc(workout)

    await expect(requireOwnedWorkout(ctx, workoutId, user1)).resolves.toBe(
      workout
    )
    expect(ctx.db.get).toHaveBeenCalledWith(workoutId)
  })

  it("rejects a missing workout", async () => {
    const ctx = createCtxWithDoc<Doc<"workouts">>(null)

    await expect(requireOwnedWorkout(ctx, workoutId, user1)).rejects.toThrow(
      "Not found"
    )
  })

  it("rejects a workout owned by a different user", async () => {
    const ctx = createCtxWithDoc(createWorkout(user2))

    await expect(requireOwnedWorkout(ctx, workoutId, user1)).rejects.toThrow(
      "Unauthorized"
    )
  })

  it("returns an owned plan", async () => {
    const plan = createPlan(user1)
    const ctx = createCtxWithDoc(plan)

    await expect(requireOwnedPlan(ctx, planId, user1)).resolves.toBe(plan)
  })

  it("rejects a plan owned by a different user", async () => {
    const ctx = createCtxWithDoc(createPlan(user2))

    await expect(requireOwnedPlan(ctx, planId, user1)).rejects.toThrow(
      "Unauthorized"
    )
  })

  it("returns an owned route", async () => {
    const route = createRoute(user1)
    const ctx = createCtxWithDoc(route)

    await expect(requireOwnedRoute(ctx, routeId, user1)).resolves.toBe(route)
  })

  it("rejects a route owned by a different user", async () => {
    const ctx = createCtxWithDoc(createRoute(user2))

    await expect(requireOwnedRoute(ctx, routeId, user1)).rejects.toThrow(
      "Unauthorized"
    )
  })

  it("authorizes plan weeks through their parent plan", async () => {
    const week = createWeek()
    const plan = createPlan(user1)
    const ctx = createCtxWithDocs([week, plan])

    await expect(requireOwnedWeek(ctx, weekId, user1)).resolves.toEqual({
      week,
      plan,
    })
    expect(ctx.db.get).toHaveBeenNthCalledWith(1, weekId)
    expect(ctx.db.get).toHaveBeenNthCalledWith(2, planId)
  })

  it("rejects plan weeks when the parent plan belongs to another user", async () => {
    const ctx = createCtxWithDocs([createWeek(), createPlan(user2)])

    await expect(requireOwnedWeek(ctx, weekId, user1)).rejects.toThrow(
      "Unauthorized"
    )
  })
})
