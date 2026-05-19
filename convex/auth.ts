import { convexAuth } from "@convex-dev/auth/server"
import { Password } from "@convex-dev/auth/providers/Password"
import { query } from "./_generated/server"
import {
  isAdminUser,
  isBootstrapAdminEmail,
  requireAuthUserId,
} from "./authHelpers"
import {
  hashInviteCode,
  normalizeEmail,
  normalizeInviteCode,
} from "./invites"
import type { Id } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"

const inviteCodeProfileField = "__rampInviteCode"

type AuthProfile = {
  email?: string
  name?: string
  image?: string
  [inviteCodeProfileField]?: string
}

type CreateOrUpdateUserArgs = {
  existingUserId: Id<"users"> | null
  type: "oauth" | "credentials" | "email" | "phone" | "verification"
  profile: AuthProfile
}

function profileForPasswordParams(params: Record<string, unknown>) {
  const email =
    typeof params.email === "string" ? normalizeEmail(params.email) : ""
  const inviteCode =
    typeof params.inviteCode === "string"
      ? normalizeInviteCode(params.inviteCode)
      : undefined

  return {
    email,
    ...(inviteCode ? { [inviteCodeProfileField]: inviteCode } : null),
  } as { email: string }
}

export async function createOrUpdateUser(
  ctx: MutationCtx,
  args: CreateOrUpdateUserArgs
): Promise<Id<"users">> {
  const email = normalizeEmail(args.profile.email ?? "")
  if (!email) {
    throw new Error("Email is required")
  }

  const isBootstrapAdmin = isBootstrapAdminEmail(email)
  const userPatch = {
    email,
    ...(typeof args.profile.name === "string"
      ? { name: args.profile.name }
      : null),
    ...(typeof args.profile.image === "string"
      ? { image: args.profile.image }
      : null),
  }

  if (args.existingUserId !== null) {
    await ctx.db.patch(args.existingUserId, {
      ...userPatch,
      ...(isBootstrapAdmin ? { role: "admin" as const } : null),
    })
    return args.existingUserId
  }

  if (isBootstrapAdmin) {
    return await ctx.db.insert("users", {
      ...userPatch,
      role: "admin",
    })
  }

  const inviteCode = args.profile[inviteCodeProfileField]
  if (!inviteCode) {
    throw new Error("Invite code is required")
  }

  const codeHash = await hashInviteCode(inviteCode)
  const invite = await ctx.db
    .query("inviteCodes")
    .withIndex("by_codeHash", (q) => q.eq("codeHash", codeHash))
    .unique()

  if (
    !invite ||
    invite.usedAt !== undefined ||
    invite.revokedAt !== undefined ||
    invite.email !== email
  ) {
    throw new Error("Invalid invite code")
  }

  const userId = await ctx.db.insert("users", {
    ...userPatch,
    role: "user",
  })
  await ctx.db.patch(invite._id, {
    usedBy: userId,
    usedAt: Date.now(),
  })

  return userId
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile: profileForPasswordParams,
    }),
  ],
  callbacks: {
    createOrUpdateUser: (ctx, args) => createOrUpdateUser(ctx, args),
  },
})

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx)
    const user = await ctx.db.get(userId)
    if (!user) {
      return null
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: isAdminUser(user) ? "admin" : "user",
    }
  },
})
