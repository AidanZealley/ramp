import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useMutation, useQuery } from "convex/react"
import { useNavigate } from "@tanstack/react-router"
import type { Id } from "../../../../convex/_generated/dataModel"
import { downloadTextFile, workoutToMrc } from "@/lib/exporters"
import type { Interval } from "@/lib/workout-utils"
import {
  useWorkoutPageController,
  type WorkoutPageController,
} from "./use-workout-page-controller"

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: vi.fn(),
}))

vi.mock("@/lib/exporters", () => ({
  downloadTextFile: vi.fn(),
  workoutToMrc: vi.fn(() => "MRC-CONTENT"),
}))

const baseIntervals: Interval[] = [
  { startPower: 100, endPower: 100, durationSeconds: 60 },
  { startPower: 150, endPower: 150, durationSeconds: 120 },
]

const workoutId = "workout-1" as Id<"workouts">

function getReadyState(controller: WorkoutPageController) {
  expect(controller.status).toBe("ready")
  return controller as Extract<WorkoutPageController, { status: "ready" }>
}

describe("useWorkoutPageController", () => {
  let workoutValue: {
    _id: Id<"workouts">
    title: string
    intervals: Interval[]
  } | null | undefined
  let settingsValue:
    | { ftp: number; powerDisplayMode: "absolute" | "percentage" }
    | undefined
  let navigateMock: ReturnType<typeof vi.fn>
  let updateWorkoutMock: ReturnType<typeof vi.fn>
  let removeWorkoutMock: ReturnType<typeof vi.fn>
  let upsertSettingsMock: ReturnType<typeof vi.fn>
  let queryCallIndex: number
  let mutationCallIndex: number

  beforeEach(() => {
    workoutValue = {
      _id: workoutId,
      title: "Threshold Builder",
      intervals: baseIntervals,
    }
    settingsValue = { ftp: 255, powerDisplayMode: "percentage" }
    navigateMock = vi.fn()
    updateWorkoutMock = vi.fn().mockResolvedValue(undefined)
    removeWorkoutMock = vi.fn().mockResolvedValue(undefined)
    upsertSettingsMock = vi.fn().mockResolvedValue(undefined)
    queryCallIndex = 0
    mutationCallIndex = 0

    ;(useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      navigateMock
    )
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
          updateWorkoutMock,
          removeWorkoutMock,
          upsertSettingsMock,
        ]
        const mutation = mutations[mutationCallIndex % mutations.length] ?? vi.fn()
        mutationCallIndex += 1
        return mutation
      }
    )
    vi.mocked(workoutToMrc).mockReturnValue("MRC-CONTENT")
  })

  it("initializes the draft from fetched workout data and starts clean", () => {
    const { result } = renderHook(() => useWorkoutPageController(workoutId))
    const controller = getReadyState(result.current)

    expect(controller.workingCopy).toEqual({
      title: "Threshold Builder",
      intervals: baseIntervals,
    })
    expect(controller.ftp).toBe(255)
    expect(controller.displayMode).toBe("percentage")
    expect(controller.isDirty).toBe(false)
  })

  it("marks the page dirty and updates the working copy when the title changes", () => {
    const { result } = renderHook(() => useWorkoutPageController(workoutId))

    act(() => {
      getReadyState(result.current).actions.changeTitle("New Name")
    })

    const controller = getReadyState(result.current)
    expect(controller.workingCopy.title).toBe("New Name")
    expect(controller.isDirty).toBe(true)
  })

  it("marks the page dirty and updates stats when intervals change", () => {
    const { result } = renderHook(() => useWorkoutPageController(workoutId))
    const nextIntervals: Interval[] = [
      { startPower: 90, endPower: 90, durationSeconds: 30 },
      { startPower: 110, endPower: 110, durationSeconds: 45 },
      { startPower: 130, endPower: 130, durationSeconds: 75 },
    ]

    act(() => {
      getReadyState(result.current).actions.changeIntervals(nextIntervals)
    })

    const controller = getReadyState(result.current)
    expect(controller.workingCopy.intervals).toEqual(nextIntervals)
    expect(controller.isDirty).toBe(true)
    expect(controller.stats.totalDurationSeconds).toBe(150)
  })

  it("reverts to fetched workout data and clears dirty state", () => {
    const { result } = renderHook(() => useWorkoutPageController(workoutId))

    act(() => {
      const controller = getReadyState(result.current)
      controller.actions.changeTitle("Edited")
      controller.actions.revert()
    })

    const controller = getReadyState(result.current)
    expect(controller.workingCopy.title).toBe("Threshold Builder")
    expect(controller.isDirty).toBe(false)
  })

  it("saves the current draft through api.workouts.update and clears dirty state", async () => {
    const { result } = renderHook(() => useWorkoutPageController(workoutId))
    const nextIntervals = [
      ...baseIntervals,
      { startPower: 180, endPower: 180, durationSeconds: 90 },
    ]

    act(() => {
      const controller = getReadyState(result.current)
      controller.actions.changeTitle("Saved Workout")
      controller.actions.changeIntervals(nextIntervals)
    })

    await act(async () => {
      await getReadyState(result.current).actions.save()
    })

    expect(updateWorkoutMock).toHaveBeenCalledWith({
      id: workoutId,
      title: "Saved Workout",
      intervals: nextIntervals,
    })

    await waitFor(() => {
      expect(getReadyState(result.current).isDirty).toBe(false)
    })
  })

  it("exports the current working copy instead of stale fetched data", () => {
    const { result } = renderHook(() => useWorkoutPageController(workoutId))
    const nextIntervals = [{ startPower: 88, endPower: 92, durationSeconds: 42 }]

    act(() => {
      getReadyState(result.current).actions.changeTitle("Draft Export")
    })

    act(() => {
      getReadyState(result.current).actions.changeIntervals(nextIntervals)
    })

    act(() => {
      getReadyState(result.current).actions.exportMrc()
    })

    expect(workoutToMrc).toHaveBeenCalledWith({
      title: "Draft Export",
      intervals: nextIntervals,
    })
    expect(downloadTextFile).toHaveBeenCalledWith(
      "MRC-CONTENT",
      "Draft Export.mrc",
      "text/plain"
    )
  })

  it("updates display mode only when the value changes", async () => {
    const { result } = renderHook(() => useWorkoutPageController(workoutId))

    await act(async () => {
      await getReadyState(result.current).actions.changeDisplayMode("percentage")
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

    act(() => {
      getReadyState(result.current).actions.requestDelete()
    })
    expect(getReadyState(result.current).showDeleteDialog).toBe(true)

    await act(async () => {
      await getReadyState(result.current).actions.deleteWorkout()
    })

    expect(removeWorkoutMock).toHaveBeenCalledWith({ id: workoutId })
    expect(navigateMock).toHaveBeenCalledWith({ to: "/" })
    expect(getReadyState(result.current).showDeleteDialog).toBe(false)
  })

  it("uses fallback append when no editor insert action is registered", () => {
    workoutValue = {
      _id: workoutId,
      title: "Empty Workout",
      intervals: [],
    }

    const { result } = renderHook(() => useWorkoutPageController(workoutId))

    act(() => {
      getReadyState(result.current).editorBridge.addInterval()
    })

    const controller = getReadyState(result.current)
    expect(controller.editorBridge.hasMountedEditor).toBe(false)
    expect(controller.workingCopy.intervals).toEqual([
      {
        startPower: 75,
        endPower: 75,
        durationSeconds: 300,
      },
    ])
  })

  it("uses the registered editor insert action for page-level add", () => {
    const { result } = renderHook(() => useWorkoutPageController(workoutId))
    const insertAction = vi.fn()

    act(() => {
      getReadyState(result.current).editorBridge.registerInsertAction(insertAction)
    })
    expect(getReadyState(result.current).editorBridge.hasMountedEditor).toBe(true)

    act(() => {
      getReadyState(result.current).editorBridge.addInterval()
    })

    expect(insertAction).toHaveBeenCalledTimes(1)
    expect(getReadyState(result.current).workingCopy.intervals).toEqual(
      baseIntervals
    )
  })
})
