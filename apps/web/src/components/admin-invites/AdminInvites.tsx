import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { Copy, Plus, X } from "lucide-react"
import { formatInviteDate, statusLabel } from "./utils"
import type { Id } from "#convex/_generated/dataModel"
import { api } from "#convex/_generated/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

export const AdminInvites = () => {
  const invites = useQuery(api.invites.list, {})
  const createInvite = useMutation(api.invites.create)
  const revokeInvite = useMutation(api.invites.revoke)
  const [email, setEmail] = React.useState("")
  const [createdCode, setCreatedCode] = React.useState<string | null>(null)
  const [pendingInviteId, setPendingInviteId] =
    React.useState<Id<"inviteCodes"> | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (invites === undefined) {
    return (
      <section className="mx-auto max-w-5xl">
        <Spinner className="text-muted-foreground" />
      </section>
    )
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setCreatedCode(null)
    setIsCreating(true)

    try {
      const result = await createInvite({ email })
      setCreatedCode(result.code)
      setEmail("")
    } catch {
      setError("Could not create invite.")
    } finally {
      setIsCreating(false)
    }
  }

  async function handleRevoke(inviteId: Id<"inviteCodes">) {
    setError(null)
    setPendingInviteId(inviteId)

    try {
      await revokeInvite({ inviteId })
    } catch {
      setError("Could not revoke invite.")
    } finally {
      setPendingInviteId(null)
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Invites
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create email-bound invite codes for private beta signups.
        </p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleCreate}>
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
          />
        </div>
        <Button
          type="submit"
          className="self-end"
          disabled={isCreating}
        >
          <Plus />
          {isCreating ? "Creating..." : "Create"}
        </Button>
      </form>

      {createdCode ? (
        <div className="space-y-2 rounded-md border bg-muted/30 p-4">
          <Label htmlFor="created-invite-code">Invite code shown once</Label>
          <div className="flex gap-2">
            <Input id="created-invite-code" value={createdCode} readOnly />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Copy invite code"
              onClick={() => void navigator.clipboard.writeText(createdCode)}
            >
              <Copy />
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="status" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Used</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No invites yet.
                </td>
              </tr>
            ) : (
              invites.map((invite) => (
                <tr key={invite._id} className="border-t">
                  <td className="px-4 py-3">{invite.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{statusLabel(invite.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatInviteDate(invite.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatInviteDate(invite.usedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {invite.status === "pending" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pendingInviteId === invite._id}
                        onClick={() => void handleRevoke(invite._id)}
                      >
                        <X />
                        Revoke
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
