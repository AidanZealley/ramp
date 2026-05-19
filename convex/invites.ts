import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireAdminUserId } from "./authHelpers"
import type { Id } from "./_generated/dataModel"

const INVITE_CODE_BYTES = 16
const BASE32_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeInviteCode(code: string): string {
  return code.replace(/[\s-]/g, "").trim().toUpperCase()
}

export async function hashInviteCode(code: string): Promise<string> {
  const normalizedCode = normalizeInviteCode(code)
  const bytes = new TextEncoder().encode(normalizedCode)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export function generateInviteCode(): string {
  const bytes = new Uint8Array(INVITE_CODE_BYTES)
  crypto.getRandomValues(bytes)

  let bits = 0
  let value = 0
  let code = ""

  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8

    while (bits >= 5) {
      code += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    code += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }

  return code.match(/.{1,4}/g)?.join("-") ?? code
}

function inviteStatus(invite: {
  usedAt?: number
  revokedAt?: number
}): "pending" | "used" | "revoked" {
  if (invite.revokedAt !== undefined) {
    return "revoked"
  }
  if (invite.usedAt !== undefined) {
    return "used"
  }
  return "pending"
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminUserId(ctx)

    const invites = await ctx.db.query("inviteCodes").order("desc").take(100)
    return invites.map((invite) => ({
      _id: invite._id,
      email: invite.email,
      createdAt: invite.createdAt,
      createdBy: invite.createdBy,
      usedAt: invite.usedAt,
      usedBy: invite.usedBy,
      revokedAt: invite.revokedAt,
      status: inviteStatus(invite),
    }))
  },
})

export const create = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args): Promise<{ inviteId: Id<"inviteCodes">; code: string }> => {
    const createdBy = await requireAdminUserId(ctx)
    const email = normalizeEmail(args.email)
    if (!email) {
      throw new Error("Email is required")
    }

    const code = generateInviteCode()
    const codeHash = await hashInviteCode(code)
    const inviteId = await ctx.db.insert("inviteCodes", {
      email,
      codeHash,
      createdBy,
      createdAt: Date.now(),
    })

    return { inviteId, code }
  },
})

export const remove = mutation({
  args: {
    inviteId: v.id("inviteCodes"),
  },
  handler: async (ctx, args) => {
    await requireAdminUserId(ctx)

    const invite = await ctx.db.get(args.inviteId)
    if (!invite) {
      throw new Error("Invite not found")
    }

    await ctx.db.delete(args.inviteId)
    return null
  },
})

export const revoke = mutation({
  args: {
    inviteId: v.id("inviteCodes"),
  },
  handler: async (ctx, args) => {
    await requireAdminUserId(ctx)

    const invite = await ctx.db.get(args.inviteId)
    if (!invite) {
      throw new Error("Invite not found")
    }
    if (invite.usedAt !== undefined) {
      throw new Error("Used invite cannot be revoked")
    }
    if (invite.revokedAt !== undefined) {
      return null
    }

    await ctx.db.patch(args.inviteId, { revokedAt: Date.now() })
    return null
  },
})
