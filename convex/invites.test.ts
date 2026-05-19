import { beforeEach, describe, expect, it, vi } from "vitest"
import { createOrUpdateUser } from "./auth"
import {
  create,
  hashInviteCode,
  list,
  normalizeEmail,
  normalizeInviteCode,
  revoke,
} from "./invites"
import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"

const authUserId = vi.hoisted(() => ({
  current: "admin-1" as Id<"users"> | null,
}))

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as Record<string, unknown>),
    getAuthUserId: vi.fn(() => Promise.resolve(authUserId.current)),
  }
})

type TestUser = Pick<
  Doc<"users">,
  "_id" | "_creationTime" | "email" | "role"
>
type TestInvite = Doc<"inviteCodes">

const adminId = "admin-1" as Id<"users">
const userId = "user-1" as Id<"users">
const inviteId = "invite-1" as Id<"inviteCodes">

function handler(registeredFunction: unknown) {
  return (
    registeredFunction as {
      _handler: (ctx: QueryCtx | MutationCtx, args: unknown) => unknown
    }
  )._handler
}

function createCtx({
  users = [],
  invites = [],
}: {
  users?: Array<TestUser>
  invites?: Array<TestInvite>
} = {}) {
  const docsById = new Map<string, TestUser | TestInvite>(
    [...users, ...invites].map((doc) => [doc._id, doc])
  )
  const inserted: Array<{ table: string; doc: Record<string, unknown> }> = []
  const patches = new Map<string, Record<string, unknown>>()

  const db = {
    get: vi.fn((id: string) => Promise.resolve(docsById.get(id) ?? null)),
    insert: vi.fn((table: string, doc: Record<string, unknown>) => {
      inserted.push({ table, doc })
      const id = `${table}-${inserted.length}`
      docsById.set(id, {
        _id: id,
        _creationTime: 1,
        ...doc,
      } as TestUser | TestInvite)
      return Promise.resolve(id)
    }),
    patch: vi.fn((id: string, patch: Record<string, unknown>) => {
      patches.set(id, { ...(patches.get(id) ?? {}), ...patch })
      const doc = docsById.get(id)
      if (doc) {
        docsById.set(id, { ...doc, ...patch })
      }
      return Promise.resolve()
    }),
    query: vi.fn((table: string) => {
      let rows = Array.from(docsById.values()).filter((doc) =>
        table === "users"
          ? doc._id.startsWith("user-") || doc._id.startsWith("admin-")
          : doc._id.startsWith("invite-") ||
            doc._id.startsWith("inviteCodes-")
      )
      const builder = {
        withIndex: vi.fn(
          (_indexName: string, cb: (q: { eq: typeof eq }) => unknown) => {
            const condition = cb({ eq }) as { field: string; value: unknown }
            rows = rows.filter(
              (doc) =>
                (doc as unknown as Record<string, unknown>)[condition.field] ===
                condition.value
            )
            return builder
          }
        ),
        order: vi.fn(() => builder),
        take: vi.fn((count: number) => Promise.resolve(rows.slice(0, count))),
        unique: vi.fn(() => Promise.resolve(rows[0] ?? null)),
      }
      return builder
    }),
  }

  return {
    ctx: { db } as unknown as QueryCtx & MutationCtx,
    db,
    inserted,
    patches,
  }
}

function eq(field: string, value: unknown) {
  return { field, value }
}

function user(
  id: Id<"users">,
  email: string,
  role: "admin" | "user" = "user"
): TestUser {
  return { _id: id, _creationTime: 1, email, role }
}

async function invite({
  email = "new@example.com",
  code = "ABCD-EFGH",
  usedAt,
  revokedAt,
}: {
  email?: string
  code?: string
  usedAt?: number
  revokedAt?: number
} = {}): Promise<TestInvite> {
  return {
    _id: inviteId,
    _creationTime: 1,
    email,
    codeHash: await hashInviteCode(code),
    createdBy: adminId,
    createdAt: 1,
    usedAt,
    usedBy: usedAt ? userId : undefined,
    revokedAt,
  }
}

describe("invite helpers", () => {
  it("normalizes emails and invite codes", () => {
    expect(normalizeEmail(" Rider@Example.COM ")).toBe("rider@example.com")
    expect(normalizeInviteCode(" abcd-ef gh ")).toBe("ABCDEFGH")
  })

  it("hashes normalized codes stably", async () => {
    await expect(hashInviteCode("abcd-efgh")).resolves.toBe(
      await hashInviteCode(" ABCD EFGH ")
    )
  })
})

describe("invite-gated account creation", () => {
  beforeEach(() => {
    process.env.BOOTSTRAP_ADMIN_EMAILS = ""
  })

  it("allows bootstrap admins without an invite", async () => {
    process.env.BOOTSTRAP_ADMIN_EMAILS = "admin@example.com"
    const { ctx, inserted } = createCtx()

    const id = await createOrUpdateUser(ctx, {
      existingUserId: null,
      type: "credentials",
      profile: { email: " Admin@Example.com " },
    })

    expect(id).toBe("users-1")
    expect(inserted[0]).toMatchObject({
      table: "users",
      doc: { email: "admin@example.com", role: "admin" },
    })
  })

  it("rejects non-bootstrap signups without a code", async () => {
    const { ctx } = createCtx()

    await expect(
      createOrUpdateUser(ctx, {
        existingUserId: null,
        type: "credentials",
        profile: { email: "new@example.com" },
      })
    ).rejects.toThrow("Invite code is required")
  })

  it("rejects wrong, email-mismatched, revoked, and used codes", async () => {
    const cases = [
      { profile: { email: "new@example.com", __rampInviteCode: "WRONG" } },
      {
        profile: {
          email: "other@example.com",
          __rampInviteCode: "ABCD-EFGH",
        },
      },
      {
        profile: { email: "new@example.com", __rampInviteCode: "ABCD-EFGH" },
        invite: await invite({ revokedAt: 2 }),
      },
      {
        profile: { email: "new@example.com", __rampInviteCode: "ABCD-EFGH" },
        invite: await invite({ usedAt: 2 }),
      },
    ]

    for (const testCase of cases) {
      const { ctx } = createCtx({
        invites: testCase.invite ? [testCase.invite] : [await invite()],
      })
      await expect(
        createOrUpdateUser(ctx, {
          existingUserId: null,
          type: "credentials",
          profile: testCase.profile,
        })
      ).rejects.toThrow("Invalid invite code")
    }
  })

  it("creates a user and marks a valid invite used", async () => {
    const { ctx, inserted, patches } = createCtx({ invites: [await invite()] })

    const id = await createOrUpdateUser(ctx, {
      existingUserId: null,
      type: "credentials",
      profile: { email: "NEW@example.com", __rampInviteCode: "abcd efgh" },
    })

    expect(id).toBe("users-1")
    expect(inserted[0]).toMatchObject({
      table: "users",
      doc: { email: "new@example.com", role: "user" },
    })
    expect(patches.get(inviteId)).toMatchObject({ usedBy: id })
    expect(patches.get(inviteId)?.usedAt).toEqual(expect.any(Number))
  })
})

describe("invite admin functions", () => {
  beforeEach(() => {
    process.env.BOOTSTRAP_ADMIN_EMAILS = ""
    authUserId.current = adminId
  })

  it("allows admins to create, list, and revoke invites", async () => {
    const { ctx, inserted, patches } = createCtx({
      users: [user(adminId, "admin@example.com", "admin")],
      invites: [await invite()],
    })

    await expect(handler(list)(ctx, {})).resolves.toMatchObject([
      { email: "new@example.com", status: "pending" },
    ])
    await expect(handler(create)(ctx, { email: " Guest@Example.com " }))
      .resolves.toHaveProperty("code")
    expect(inserted[0]).toMatchObject({
      table: "inviteCodes",
      doc: { email: "guest@example.com", createdBy: adminId },
    })
    expect(inserted[0]?.doc.codeHash).toEqual(expect.any(String))
    expect(inserted[0]?.doc).not.toHaveProperty("code")

    await expect(handler(revoke)(ctx, { inviteId })).resolves.toBeNull()
    expect(patches.get(inviteId)?.revokedAt).toEqual(expect.any(Number))
  })

  it("rejects regular users", async () => {
    const { ctx } = createCtx({ users: [user(adminId, "user@example.com")] })

    await expect(handler(list)(ctx, {})).rejects.toThrow("Unauthorized")
    await expect(handler(create)(ctx, { email: "new@example.com" })).rejects.toThrow(
      "Unauthorized"
    )
    await expect(handler(revoke)(ctx, { inviteId })).rejects.toThrow(
      "Unauthorized"
    )
  })

  it("does not revoke used invites", async () => {
    const { ctx } = createCtx({
      users: [user(adminId, "admin@example.com", "admin")],
      invites: [await invite({ usedAt: 2 })],
    })

    await expect(handler(revoke)(ctx, { inviteId })).rejects.toThrow(
      "Used invite cannot be revoked"
    )
  })
})
