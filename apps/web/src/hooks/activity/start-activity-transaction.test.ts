import { describe, expect, it, vi } from "vitest"
import { startActivityTransaction } from "./start-activity-transaction"
import type { ActivityClientDoc } from "@/components/activity/types"

const activity = {
  _id: "activity-1",
} as ActivityClientDoc

describe("startActivityTransaction", () => {
  it("returns success when start activity and local start both succeed", async () => {
    const startLocal = vi.fn(() => Promise.resolve())

    const result = await startActivityTransaction({
      startActivity: async () => ({ ok: true, activity }),
      startLocal,
      discardActivity: vi.fn(),
    })

    expect(result).toEqual({ ok: true, activity })
    expect(startLocal).toHaveBeenCalledWith(activity)
  })

  it("returns unresolved result and does not call local start when blocked", async () => {
    const startLocal = vi.fn()
    const blockedActivity = { _id: "blocked-activity" } as ActivityClientDoc

    const result = await startActivityTransaction({
      startActivity: async () => ({
        ok: false,
        reason: "unresolvedActivityExists",
        activity: blockedActivity,
      }),
      startLocal,
      discardActivity: vi.fn(),
    })

    expect(result).toEqual({
      ok: false,
      reason: "unresolvedActivityExists",
      activity: blockedActivity,
    })
    expect(startLocal).not.toHaveBeenCalled()
  })

  it("discards created activity when local start throws", async () => {
    const error = new Error("dispatch failed")
    const discardActivity = vi.fn(() => Promise.resolve())

    const result = await startActivityTransaction({
      startActivity: async () => ({ ok: true, activity }),
      startLocal: async () => {
        throw error
      },
      discardActivity,
    })

    expect(discardActivity).toHaveBeenCalledWith(activity)
    expect(result).toEqual({
      ok: false,
      reason: "localStartFailed",
      activity: null,
      error,
    })
  })

  it("calls resetLocal when local start throws", async () => {
    const resetLocal = vi.fn()

    await startActivityTransaction({
      startActivity: async () => ({ ok: true, activity }),
      startLocal: async () => {
        throw new Error("dispatch failed")
      },
      discardActivity: vi.fn(() => Promise.resolve()),
      resetLocal,
    })

    expect(resetLocal).toHaveBeenCalledOnce()
  })

  it("returns localStartFailed even if cleanup discard also throws", async () => {
    const error = new Error("dispatch failed")
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)

    const result = await startActivityTransaction({
      startActivity: async () => ({ ok: true, activity }),
      startLocal: async () => {
        throw error
      },
      discardActivity: async () => {
        throw new Error("cleanup failed")
      },
    })

    expect(result).toEqual({
      ok: false,
      reason: "localStartFailed",
      activity: null,
      error,
    })
    expect(consoleError).toHaveBeenCalledWith(
      "[activity] cleanup failed",
      expect.any(Error)
    )
    consoleError.mockRestore()
  })

  it("supports no-activity local starts", async () => {
    const startLocal = vi.fn(() => Promise.resolve())
    const discardActivity = vi.fn()

    const result = await startActivityTransaction({
      startActivity: async () => ({ ok: true, activity: null }),
      startLocal,
      discardActivity,
    })

    expect(result).toEqual({ ok: true, activity: null })
    expect(startLocal).toHaveBeenCalledWith(null)
    expect(discardActivity).not.toHaveBeenCalled()
  })
})
