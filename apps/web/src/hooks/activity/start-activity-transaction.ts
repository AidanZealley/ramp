import type {
  ActivityStartTransactionResult,
  StartActivityTransactionArgs,
} from "@/hooks/activity/types"

export async function startActivityTransaction(
  args: StartActivityTransactionArgs
): Promise<ActivityStartTransactionResult> {
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
