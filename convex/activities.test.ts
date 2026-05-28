import { describe, expect, it } from "vitest"
import {
  computePlannedAverageWatts,
  createRouteSnapshot,
  createWorkoutSnapshot,
  normalizeActivityTitle,
} from "./activities"
import type { Doc, Id } from "./_generated/dataModel"

const workout = {
  _id: "workout-1" as Id<"workouts">,
  _creationTime: 1,
  ownerId: "user-1" as Id<"users">,
  title: "Threshold",
  intervalsRevision: 3,
  intervals: [
    { startPower: 100, endPower: 100, durationSeconds: 60 },
    { startPower: 50, endPower: 150, durationSeconds: 60 },
  ],
} satisfies Doc<"workouts">

const route = {
  _id: "route-1" as Id<"routes">,
  _creationTime: 1,
  ownerId: "user-1" as Id<"users">,
  title: "Loop",
  source: "gpx",
  fileStorageId: "storage-1" as Id<"_storage">,
  originalFileName: "loop.gpx",
  contentType: "application/gpx+xml",
  fileSizeBytes: 100,
  stats: {
    distanceMeters: 1000,
    elevationGainMeters: 20,
    elevationLossMeters: 15,
    minElevationMeters: 1,
    maxElevationMeters: 21,
    pointCount: 4,
  },
  bounds: null,
  start: null,
  finish: null,
  previewPoints: [{ x: 0, y: 1 }],
} satisfies Doc<"routes">

describe("activities helpers", () => {
  it("creates workout snapshots from source state", () => {
    expect(createWorkoutSnapshot(workout, 250)).toMatchObject({
      kind: "workout",
      workoutId: workout._id,
      title: "Threshold",
      intervalsRevision: 3,
      ftpAtStart: 250,
      totalDurationSeconds: 120,
      intervals: workout.intervals,
    })
  })

  it("defaults legacy workout revision in snapshots", () => {
    expect(
      createWorkoutSnapshot({ ...workout, intervalsRevision: undefined }, 250)
        .intervalsRevision
    ).toBe(0)
  })

  it("computes planned average watts from percent intervals and FTP", () => {
    expect(computePlannedAverageWatts(workout.intervals, 250)).toBe(250)
    expect(computePlannedAverageWatts([], 250)).toBeNull()
  })

  it("creates compact route snapshots", () => {
    expect(createRouteSnapshot(route)).toEqual({
      kind: "route",
      routeId: route._id,
      title: "Loop",
      originalFileName: "loop.gpx",
      stats: route.stats,
      bounds: null,
      start: null,
      finish: null,
      previewPoints: route.previewPoints,
    })
  })

  it("normalizes activity titles", () => {
    expect(normalizeActivityTitle("  Morning   Ride  ")).toBe("Morning Ride")
    expect(() => normalizeActivityTitle("   ")).toThrow("Activity title")
  })
})
