import { beforeEach, describe, expect, it, vi } from "vitest"
import * as plans from "./plans"
import * as routes from "./routes"
import * as workouts from "./workouts"
import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"

const authUserId = vi.hoisted(() => ({
  current: "user-1" as Id<"users">,
}))

vi.mock("@convex-dev/auth/server", () => {
  return {
    getAuthUserId: vi.fn(() => Promise.resolve(authUserId.current)),
  }
})

type TestDoc =
  | Doc<"workouts">
  | Doc<"plans">
  | Doc<"planWeeks">
  | Doc<"planWeekWorkouts">
  | Doc<"routes">

const user1 = "user-1" as Id<"users">
const user2 = "user-2" as Id<"users">
const workout1Id = "workout-1" as Id<"workouts">
const workout2Id = "workout-2" as Id<"workouts">
const plan1Id = "plan-1" as Id<"plans">
const plan2Id = "plan-2" as Id<"plans">
const week1Id = "week-1" as Id<"planWeeks">
const week2Id = "week-2" as Id<"planWeeks">
const slot1Id = "slot-1" as Id<"planWeekWorkouts">
const slot2Id = "slot-2" as Id<"planWeekWorkouts">
const route1Id = "route-1" as Id<"routes">

function workout(id: Id<"workouts">, ownerId: Id<"users">): Doc<"workouts"> {
  return {
    _id: id,
    _creationTime: 1,
    ownerId,
    title: "Workout",
    intervals: [{ startPower: 100, endPower: 100, durationSeconds: 60 }],
    intervalsRevision: 0,
  }
}

function plan(id: Id<"plans">, ownerId: Id<"users">): Doc<"plans"> {
  return { _id: id, _creationTime: 1, ownerId, title: "Plan" }
}

function week(
  id: Id<"planWeeks">,
  planId: Id<"plans">,
  orderIndex = 0
): Doc<"planWeeks"> {
  return { _id: id, _creationTime: 1, planId, orderIndex }
}

function slot(
  id: Id<"planWeekWorkouts">,
  weekId: Id<"planWeeks">,
  workoutId: Id<"workouts"> | null
): Doc<"planWeekWorkouts"> {
  return { _id: id, _creationTime: 1, weekId, workoutId, dayIndex: 0 }
}

function route(id: Id<"routes">, ownerId: Id<"users">): Doc<"routes"> {
  return {
    _id: id,
    _creationTime: 1,
    ownerId,
    title: "Route",
    source: "gpx",
    fileStorageId: "storage-1" as Id<"_storage">,
    originalFileName: "route.gpx",
    contentType: "application/gpx+xml",
    fileSizeBytes: 100,
    stats: {
      distanceMeters: 1000,
      elevationGainMeters: 10,
      elevationLossMeters: 10,
      minElevationMeters: 0,
      maxElevationMeters: 10,
      pointCount: 2,
    },
    bounds: null,
    start: null,
    finish: null,
    previewPoints: [],
  }
}

function createCtx(docs: Array<TestDoc>) {
  const docsById = new Map<string, TestDoc>(
    docs.map((doc) => [doc._id as string, doc])
  )
  const patches = new Map<string, Record<string, unknown>>()
  const deleted = new Set<string>()
  const inserted: Array<{ table: string; doc: Record<string, unknown> }> = []

  const queryDocs = (table: string) =>
    Array.from(docsById.values()).filter((doc) => {
      if (table === "workouts") return doc._id.startsWith("workout-")
      if (table === "plans") return doc._id.startsWith("plan-")
      if (table === "planWeeks") return doc._id.startsWith("week-")
      if (table === "planWeekWorkouts") return doc._id.startsWith("slot-")
      if (table === "routes") return doc._id.startsWith("route-")
      return false
    })

  const db = {
    get: vi.fn((id: string) => Promise.resolve(docsById.get(id) ?? null)),
    patch: vi.fn((id: string, patch: Record<string, unknown>) => {
      patches.set(id, { ...(patches.get(id) ?? {}), ...patch })
      const doc = docsById.get(id)
      if (doc) {
        docsById.set(id, { ...doc, ...patch })
      }
      return Promise.resolve()
    }),
    delete: vi.fn((id: string) => {
      deleted.add(id)
      docsById.delete(id)
      return Promise.resolve()
    }),
    insert: vi.fn((table: string, doc: Record<string, unknown>) => {
      inserted.push({ table, doc })
      return Promise.resolve(`${table}-${inserted.length}`)
    }),
    query: vi.fn((table: string) => {
      let rows = queryDocs(table)
      const builder = {
        withIndex: vi.fn(
          (_indexName: string, cb: (q: { eq: typeof eq }) => unknown) => {
            const condition = cb({ eq }) as { field: string; value: unknown }
            rows = rows.filter(
              (doc) =>
                (doc as unknown as Record<string, unknown>)[condition.field] ===
                condition.value
            )
            return builder
          }
        ),
        order: vi.fn(() => builder),
        collect: vi.fn(() => Promise.resolve(rows)),
        take: vi.fn((count: number) => Promise.resolve(rows.slice(0, count))),
      }
      return builder
    }),
  }

  const ctx = {
    db,
    scheduler: { runAfter: vi.fn() },
    storage: {
      delete: vi.fn(() => Promise.resolve()),
      getUrl: vi.fn(() => Promise.resolve("https://file")),
    },
  } as unknown as QueryCtx & MutationCtx

  return { ctx, db, patches, deleted, inserted }
}

function eq(field: string, value: unknown) {
  return { field, value }
}

function handler(registeredFunction: unknown) {
  return (
    registeredFunction as {
      _handler: (ctx: QueryCtx | MutationCtx, args: unknown) => unknown
    }
  )._handler
}

describe("public Convex function authorization", () => {
  beforeEach(() => {
    authUserId.current = user1
  })

  it("returns null for cross-user reads", async () => {
    const { ctx } = createCtx([
      workout(workout1Id, user2),
      plan(plan1Id, user2),
      route(route1Id, user2),
    ])

    await expect(
      handler(workouts.get)(ctx, { id: workout1Id })
    ).resolves.toBeNull()
    await expect(
      handler(plans.get)(ctx, { planId: plan1Id })
    ).resolves.toBeNull()
    await expect(handler(routes.get)(ctx, { id: route1Id })).resolves.toBeNull()
  })

  it("rejects cross-user workout mutations", async () => {
    const { ctx } = createCtx([workout(workout1Id, user2)])

    await expect(
      handler(workouts.updateIntervals)(ctx, {
        id: workout1Id,
        intervals: [],
        expectedIntervalsRevision: 0,
      })
    ).rejects.toThrow("Unauthorized")
    await expect(
      handler(workouts.updateTitle)(ctx, {
        id: workout1Id,
        title: "New",
      })
    ).rejects.toThrow("Unauthorized")
    await expect(
      handler(workouts.duplicateWorkout)(ctx, {
        id: workout1Id,
      })
    ).rejects.toThrow("Unauthorized")
    await expect(
      handler(workouts.remove)(ctx, { id: workout1Id })
    ).rejects.toThrow("Unauthorized")
  })

  it("rejects cross-user route mutations", async () => {
    const { ctx } = createCtx([route(route1Id, user2)])

    await expect(
      handler(routes.updateTitle)(ctx, {
        id: route1Id,
        title: "New",
      })
    ).rejects.toThrow("Unauthorized")
    await expect(handler(routes.remove)(ctx, { id: route1Id })).rejects.toThrow(
      "Unauthorized"
    )
  })

  it("rejects cross-user plan and week mutations", async () => {
    const { ctx } = createCtx([
      plan(plan1Id, user2),
      week(week1Id, plan1Id),
      workout(workout1Id, user1),
    ])

    await expect(
      handler(plans.updateTitle)(ctx, {
        planId: plan1Id,
        title: "New",
      })
    ).rejects.toThrow("Unauthorized")
    await expect(
      handler(plans.remove)(ctx, { planId: plan1Id })
    ).rejects.toThrow("Unauthorized")
    await expect(
      handler(plans.duplicatePlan)(ctx, { planId: plan1Id })
    ).rejects.toThrow("Plan not found")
    await expect(
      handler(plans.addWeek)(ctx, { planId: plan1Id })
    ).rejects.toThrow("Unauthorized")
    await expect(
      handler(plans.removeWeek)(ctx, { weekId: week1Id })
    ).rejects.toThrow("Unauthorized")
    await expect(
      handler(plans.updateWeekSchedule)(ctx, {
        weekId: week1Id,
        workoutIdsByDay: [workout1Id, null, null, null, null, null, null],
      })
    ).rejects.toThrow("Unauthorized")
  })

  it("rejects scheduling another user's workout into an owned plan week", async () => {
    const { ctx } = createCtx([
      plan(plan1Id, user1),
      week(week1Id, plan1Id),
      workout(workout2Id, user2),
    ])

    await expect(
      handler(plans.updateWeekSchedule)(ctx, {
        weekId: week1Id,
        workoutIdsByDay: [workout2Id, null, null, null, null, null, null],
      })
    ).rejects.toThrow("Unauthorized")
  })

  it("skips cross-owner workout references during deletion cleanup", async () => {
    const { ctx, db, patches, deleted } = createCtx([
      workout(workout1Id, user1),
      plan(plan1Id, user1),
      plan(plan2Id, user2),
      week(week1Id, plan1Id),
      week(week2Id, plan2Id),
      slot(slot1Id, week1Id, workout1Id),
      slot(slot2Id, week2Id, workout1Id),
    ])

    await handler(workouts.remove)(ctx, { id: workout1Id })

    expect(deleted.has(workout1Id)).toBe(true)
    expect(patches.get(slot1Id)).toEqual({ workoutId: null })
    expect(patches.has(slot2Id)).toBe(false)
    expect(db.patch).toHaveBeenCalledTimes(1)
  })
})
