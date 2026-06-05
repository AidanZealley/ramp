import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useConvex, useMutation, useQuery } from "convex/react"
import type { ActivityClientDoc } from "@/components/activity/types"
import type { Id } from "#convex/_generated/dataModel"
import { api } from "#convex/_generated/api"
import { useActivitySession } from "@/hooks/activity/use-activity-session"

vi.mock("convex/react", () => ({
  useConvex: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}))

const workoutActivity = { _id: "activity-workout" } as ActivityClientDoc
const routeActivity = { _id: "activity-route" } as ActivityClientDoc
const rampActivity = { _id: "activity-ramp" } as ActivityClientDoc
const blockedActivity = { _id: "activity-blocked" } as ActivityClientDoc

const workoutId = "workout-1" as Id<"workouts">
const routeId = "route-1" as Id<"routes">
const blockedActivityId = "activity-blocked" as Id<"activities">

function createUnresolvedActivityError(activityId?: Id<"activities">) {
  const error = new Error("blocked") as Error & {
    data: {
      kind: "unresolvedActivityExists"
      activityId?: Id<"activities">
    }
  }
  error.data = {
    kind: "unresolvedActivityExists",
    activityId,
  }
  return error
}

describe("useActivitySession", () => {
  let startActivityMock: ReturnType<typeof vi.fn>
  let saveProgressMock: ReturnType<typeof vi.fn>
  let markPendingMock: ReturnType<typeof vi.fn>
  let completeMock: ReturnType<typeof vi.fn>
  let discardMock: ReturnType<typeof vi.fn>
  let convexQueryMock: ReturnType<typeof vi.fn>
  let unresolvedActivityValue: ActivityClientDoc | null | undefined
  let queryCallIndex: number
  let mutationCallIndex: number

  beforeEach(() => {
    startActivityMock = vi.fn()
    saveProgressMock = vi.fn()
    markPendingMock = vi.fn()
    completeMock = vi.fn()
    discardMock = vi.fn()
    convexQueryMock = vi.fn()
    unresolvedActivityValue = null
    queryCallIndex = 0
    mutationCallIndex = 0

    ;(useConvex as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      query: convexQueryMock,
    })
    ;(useQuery as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        const currentCall = queryCallIndex % 2
        queryCallIndex += 1
        return currentCall === 0 ? unresolvedActivityValue : undefined
      }
    )
    ;(useMutation as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        const mutations = [
          startActivityMock,
          saveProgressMock,
          markPendingMock,
          completeMock,
          discardMock,
        ]
        const mutation =
          mutations[mutationCallIndex % mutations.length] ?? vi.fn()
        mutationCallIndex += 1
        return mutation
      }
    )
  })

  async function renderAndStartRouteActivity() {
    const { result } = renderHook(() => useActivitySession({}))
    let resultValue: Awaited<ReturnType<typeof result.current.startRouteActivity>>

    await act(async () => {
      resultValue = await result.current.startRouteActivity({ routeId })
    })

    return { result, resultValue: resultValue! }
  }

  function expectUnresolvedActivityResult(
    resultValue: Awaited<ReturnType<typeof startActivityMock>>
  ) {
    expect(resultValue).toEqual({
      ok: false,
      reason: "unresolvedActivityExists",
      activity: blockedActivity,
    })
  }

  it("sends the workout start payload and stores the local activity", async () => {
    startActivityMock.mockResolvedValueOnce(workoutActivity)
    const { result } = renderHook(() => useActivitySession({}))
    let resultValue: Awaited<
      ReturnType<typeof result.current.startWorkoutActivity>
    >

    await act(async () => {
      resultValue = await result.current.startWorkoutActivity({
        workoutId,
        ftpAtStart: 250,
      })
    })

    expect(startActivityMock).toHaveBeenCalledWith({
      activity: {
        sourceKind: "workout",
        workoutId,
        experienceId: "live-workout",
        ftpAtStart: 250,
      },
    })
    expect(resultValue!).toEqual({ ok: true, activity: workoutActivity })
    expect(result.current.resumeActivity).toEqual(workoutActivity)
  })

  it("sends the route start payload and stores the local activity", async () => {
    startActivityMock.mockResolvedValueOnce(routeActivity)
    const { result, resultValue } = await renderAndStartRouteActivity()

    expect(startActivityMock).toHaveBeenCalledWith({
      activity: {
        sourceKind: "route",
        routeId,
        experienceId: "route",
      },
    })
    expect(resultValue).toEqual({ ok: true, activity: routeActivity })
    expect(result.current.resumeActivity).toEqual(routeActivity)
  })

  it("sends the ramp test start payload and stores the local activity", async () => {
    startActivityMock.mockResolvedValueOnce(rampActivity)
    const { result } = renderHook(() => useActivitySession({}))
    let resultValue: Awaited<
      ReturnType<typeof result.current.startRampTestActivity>
    >

    await act(async () => {
      resultValue = await result.current.startRampTestActivity({
        builtInId: "ramp-test-default",
        ftpAtStart: 250,
      })
    })

    expect(startActivityMock).toHaveBeenCalledWith({
      activity: {
        sourceKind: "ramp-test",
        builtInId: "ramp-test-default",
        experienceId: "ramp-test",
        ftpAtStart: 250,
      },
    })
    expect(resultValue!).toEqual({ ok: true, activity: rampActivity })
    expect(result.current.resumeActivity).toEqual(rampActivity)
  })

  it("returns the blocked activity for an unresolved activity error", async () => {
    startActivityMock.mockRejectedValueOnce(
      createUnresolvedActivityError(blockedActivityId)
    )
    convexQueryMock.mockResolvedValueOnce(blockedActivity)
    const { resultValue } = await renderAndStartRouteActivity()

    expect(convexQueryMock).toHaveBeenCalledWith(api.activities.get, {
      activityId: blockedActivityId,
    })
    expectUnresolvedActivityResult(resultValue)
  })

  it("falls back to the current unresolved query result without an activity id", async () => {
    unresolvedActivityValue = blockedActivity
    startActivityMock.mockRejectedValueOnce(createUnresolvedActivityError())
    const { resultValue } = await renderAndStartRouteActivity()

    expect(convexQueryMock).not.toHaveBeenCalled()
    expectUnresolvedActivityResult(resultValue)
  })

  it("rethrows unexpected start errors", async () => {
    startActivityMock.mockRejectedValueOnce(new Error("network failed"))
    const { result } = renderHook(() => useActivitySession({}))

    await expect(
      result.current.startRouteActivity({ routeId })
    ).rejects.toThrow("network failed")
    expect(result.current.resumeActivity).toBeNull()
  })
})
