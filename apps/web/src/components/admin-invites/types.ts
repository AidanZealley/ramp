import type { Id } from "#convex/_generated/dataModel"

export type InviteStatus = "pending" | "used" | "revoked"

export type InviteListItem = {
  _id: Id<"inviteCodes">
  email: string
  createdAt: number
  createdBy: Id<"users">
  usedAt?: number
  usedBy?: Id<"users">
  revokedAt?: number
  status: InviteStatus
}
