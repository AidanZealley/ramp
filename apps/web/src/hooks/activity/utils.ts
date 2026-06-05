import type { UnresolvedActivityError } from "@/hooks/activity/types"

export function isUnresolvedActivityError(
  error: unknown
): error is UnresolvedActivityError {
  return (
    error instanceof Error &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "kind" in error.data &&
    error.data.kind === "unresolvedActivityExists"
  )
}
