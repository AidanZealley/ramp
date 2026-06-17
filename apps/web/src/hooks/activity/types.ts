import type { FunctionArgs } from "convex/server"
import type {
  ActivityClientDoc,
  ActivityStartResult,
} from "@/components/activity/types"
import type { Id } from "#convex/_generated/dataModel"
import type { api } from "#convex/_generated/api"

export type UseActivitySessionArgs = {
  activityId?: Id<"activities">
}

export type StartActivityInput = FunctionArgs<
  typeof api.activities.start
>["activity"]

export type UnresolvedActivityError = Error & {
  data?: {
    kind?: string
    activityId?: Id<"activities">
  }
}

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

export type StartActivityTransactionArgs = {
  startActivity: () => Promise<
    ActivityStartResult | { ok: true; activity: null }
  >
  startLocal: (activity: ActivityClientDoc | null) => Promise<void>
  discardActivity: (activity: ActivityClientDoc) => Promise<void>
  resetLocal?: () => void | Promise<void>
  onLocalStartFailed?: (error: unknown) => void
}
