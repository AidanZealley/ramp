import type { InviteStatus } from "./types"

export function formatInviteDate(timestamp?: number): string {
  if (timestamp === undefined) {
    return "-"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp))
}

export function statusLabel(status: InviteStatus): string {
  if (status === "pending") {
    return "Pending"
  }
  if (status === "used") {
    return "Used"
  }
  return "Revoked"
}
