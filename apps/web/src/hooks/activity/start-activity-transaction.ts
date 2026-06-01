import type {
  ActivityClientDoc,
  ActivityStartResult,
} from "@/components/activity/types"

export type ActivityStartTransactionResult =
  | { ok: true; activity: ActivityClientDoc | null }
  | {
      ok: false
      reason: "unresolvedActivityExists"
      activity: ActivityClientDoc | null
    }
  | {
      ok: false
      reason: "localStartFailed"
      activity: null
      error: unknown
    }

export async function startActivityTransaction(args: {
  startActivity: () => Promise<
    ActivityStartResult | { ok: true; activity: null }
  >
  startLocal: (activity: ActivityClientDoc | null) => Promise<void>
  discardActivity: (activity: ActivityClientDoc) => Promise<void>
  resetLocal?: () => void | Promise<void>
  onLocalStartFailed?: (error: unknown) => void
}): Promise<ActivityStartTransactionResult> {
  const startResult = await args.startActivity()
  if (!startResult.ok) {
    return startResult
  }

  const activity = startResult.activity

  try {
    await args.startLocal(activity)
    return { ok: true, activity }
  } catch (error) {
    if (activity) {
      try {
        await args.discardActivity(activity)
      } catch (cleanupError) {
        console.error("[activity] cleanup failed", cleanupError)
      }
    }

    await args.resetLocal?.()
    args.onLocalStartFailed?.(error)

    return {
      ok: false,
      reason: "localStartFailed",
      activity: null,
      error,
    }
  }
}
