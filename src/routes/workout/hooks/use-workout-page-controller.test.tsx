import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useConvex, useMutation, useQuery } from "convex/react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { useWorkoutPageController } from "./use-workout-page-controller"
import type { WorkoutPageController } from "./use-workout-page-controller"
import type { ConvexError } from "convex/values"
import type { Id } from "../../../../convex/_generated/dataModel"
import type { Interval } from "@/lib/workout-utils"
import { downloadTextFile, workoutToMrc } from "@/lib/exporters"

vi.mock("convex/react", () => ({
  useConvex: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}))

vi.mock("@/lib/exporters", () => ({
  downloadTextFile: vi.fn(),
  workoutToMrc: vi.fn(() => "MRC-CONTENT"),
}))

const baseIntervals: Array<Interval> = [
  { startPower: 100, endPower: 100, durationSeconds: 60 },
  { startPower: 150, endPower: 150, durationSeconds: 120 },
]

const workoutId = "workout-1" as Id<"workouts">

function getReadyState(controller: WorkoutPageController) {
  expect(controller.status).toBe("ready")
  return controller as Extract<WorkoutPageController, { status: "ready" }>
}

function createConflictError(): ConvexError<{
  kind: "intervalsRevisionConflict"
  currentIntervalsRevision: number
}> {
  const error = new Error("conflict") as ConvexError<{
    kind: "intervalsRevisionConflict"
    currentIntervalsRevision: number
  }>
  error.data = {
    kind: "intervalsRevisionConflict",
    currentIntervalsRevision: 3,
  }
  return error
}

describe("useWorkoutPageController", () => {
  let workoutValue:
    | {
        _id: Id<"workouts">
        title: string
        intervals: Array<Interval>
        intervalsRevision: number
      }
    | null
    | undefined
  let settingsValue:
    | { ftp: number; powerDisplayMode: "absolute" | "percentage" }
    | undefined
  let navigateMock: ReturnType<typeof vi.fn>
  let updateIntervalsMock: ReturnType<typeof vi.fn>
  let duplicateWorkoutMock: ReturnType<typeof vi.fn>
  let removeWorkoutMock: ReturnType<typeof vi.fn>
  let upsertSettingsMock: ReturnType<typeof vi.fn>
  let convexQueryMock: ReturnType<typeof vi.fn>
  let queryCallIndex: number
  let mutationCallIndex: number

  beforeEach(() => {
    workoutValue = {
      _id: workoutId,
      title: "Threshold Builder",
      intervals: baseIntervals,
      intervalsRevision: 0,
    }
    settingsValue = { ftp: 255, powerDisplayMode: "percentage" }
    navigateMock = vi.fn()
    updateIntervalsMock = vi.fn().mockResolvedValue(undefined)
    duplicateWorkoutMock = vi
      .fn()
      .mockResolvedValue("workout-2" as Id<"workouts">)
    removeWorkoutMock = vi.fn().mockResolvedValue(undefined)
    upsertSettingsMock = vi.fn().mockResolvedValue(undefined)
    convexQueryMock = vi.fn().mockResolvedValue({
      _id: workoutId,
      title: "Threshold Builder",
      intervals: [{ startPower: 90, endPower: 90, durationSeconds: 30 }],
      intervalsRevision: 1,
    })
    queryCallIndex = 0
    mutationCallIndex = 0
    ;(useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      navigateMock
    )
    ;(useConvex as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      query: convexQueryMock,
    })
    ;(useQuery as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        const currentCall = queryCallIndex % 2
        queryCallIndex += 1
        return currentCall === 0 ? workoutValue : settingsValue
      }
    )
    ;(useMutation as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        const mutations = [
          updateIntervalsMock,
          duplicateWorkoutMock,
          removeWorkoutMock,
          upsertSettingsMock,
        ]
        const mutation =
          mutations[mutationCallIndex % mutations.length] ?? vi.fn()
        mutationCallIndex += 1
        return mutation
      }
    )
    vi.mocked(workoutToMrc).mockReturnValue("MRC-CONTENT")
  })

  it("exposes the fetched workout, display mode, and ftp", () => {
    const { result } = renderHook(() => useWorkoutPageController(workoutId))
    const controller = getReadyState(result.current)

    expect(controller.workout).toEqual(workoutValue)
    expect(controller.ftp).toBe(255)
    expect(controller.displayMode).toBe("percentage")
  })

  it("saves intervals through api.workouts.updateIntervals", async () => {
    const { result } = renderHook(() => useWorkoutPageController(workoutId))

    await act(async () => {
      const status = await getReadyState(result.current).actions.saveIntervals({
        intervals: [
          ...baseIntervals,
          { startPower: 180, endPower: 180, durationSeconds: 90 },
        ],
        expectedIntervalsRevision: 0,
        force: false,
      })
      expect(status).toBe("saved")
    })

    expect(updateIntervalsMock).toHaveBeenCalledWith({
      id: workoutId,
      intervals: [
        ...baseIntervals,
        { startPower: 180, endPower: 180, durationSeconds: 90 },
      ],
      expectedIntervalsRevision: 0,
      force: false,
    })
  })

  it("refreshes latest workout data and reports a conflict on stale saves", async () => {
    updateIntervalsMock.mockRejectedValueOnce(createConflictError())
    const { result } = renderHook(() => useWorkoutPageController(workoutId))

    await act(async () => {
      const status = await getReadyState(result.current).actions.saveIntervals({
        intervals: baseIntervals,
        expectedIntervalsRevision: 0,
        force: false,
      })
      expect(status).toBe("conflict")
    })

    expect(convexQueryMock).toHaveBeenCalled()
    expect(getReadyState(result.current).workout.intervalsRevision).toBe(1)
  })

  it("exports passed intervals with the persisted workout title", () => {
    const { result } = renderHook(() => useWorkoutPageController(workoutId))
    const nextIntervals = [
      { startPower: 88, endPower: 92, durationSeconds: 42 },
    ]

    act(() => {
      getReadyState(result.current).actions.exportIntervals(nextIntervals)
    })

    expect(workoutToMrc).toHaveBeenCalledWith({
      title: "Threshold Builder",
      intervals: nextIntervals,
    })
    expect(downloadTextFile).toHaveBeenCalledWith(
      "MRC-CONTENT",
      "Threshold Builder.mrc",
      "text/plain"
    )
  })

  it("updates display mode only when the value changes", async () => {
    const { result } = renderHook(() => useWorkoutPageController(workoutId))

    await act(async () => {
      await getReadyState(result.current).actions.changeDisplayMode(
        "percentage"
      )
    })
    expect(upsertSettingsMock).not.toHaveBeenCalled()

    await act(async () => {
      await getReadyState(result.current).actions.changeDisplayMode("absolute")
    })
    expect(upsertSettingsMock).toHaveBeenCalledWith({
      powerDisplayMode: "absolute",
    })
  })

  it("deletes the workout and navigates back to the root route", async () => {
    const { result } = renderHook(() => useWorkoutPageController(workoutId))

    await act(async () => {
      await getReadyState(result.current).actions.deleteWorkout()
    })

    expect(removeWorkoutMock).toHaveBeenCalledWith({ id: workoutId })
    expect(navigateMock).toHaveBeenCalledWith({ to: "/" })
    expect(toast.success).toHaveBeenCalledWith("Workout deleted")
  })

  it("duplicates the workout and navigates to the copied workout", async () => {
    const { result } = renderHook(() => useWorkoutPageController(workoutId))

    await act(async () => {
      await getReadyState(result.current).actions.duplicateWorkout()
    })

    expect(duplicateWorkoutMock).toHaveBeenCalledWith({ id: workoutId })
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/workout/$id",
      params: { id: "workout-2" },
    })
    expect(toast.success).toHaveBeenCalledWith("Workout duplicated")
  })
})
