import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Copy, Plus } from "lucide-react"
import { InvitesTable } from "./components/invites-table"
import type { Id } from "#convex/_generated/dataModel"
import { api } from "#convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

export const AdminInvites = () => {
  const navigate = useNavigate()
  const invites = useQuery(api.invites.list, {})
  const createInvite = useMutation(api.invites.create)
  const revokeInvite = useMutation(api.invites.revoke)
  const deleteInvite = useMutation(api.invites.remove)
  const [email, setEmail] = React.useState("")
  const [createdCode, setCreatedCode] = React.useState<string | null>(null)
  const [pendingInviteId, setPendingInviteId] =
    React.useState<Id<"inviteCodes"> | null>(null)
  const [pendingDeleteId, setPendingDeleteId] =
    React.useState<Id<"inviteCodes"> | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleRevoke = React.useCallback(
    async (inviteId: Id<"inviteCodes">) => {
      setError(null)
      setPendingInviteId(inviteId)
      try {
        await revokeInvite({ inviteId })
      } catch {
        setError("Could not revoke invite.")
      } finally {
        setPendingInviteId(null)
      }
    },
    [revokeInvite]
  )

  const handleDelete = React.useCallback(
    async (inviteId: Id<"inviteCodes">) => {
      setError(null)
      setPendingDeleteId(inviteId)
      try {
        await deleteInvite({ inviteId })
      } catch {
        setError("Could not delete invite.")
      } finally {
        setPendingDeleteId(null)
      }
    },
    [deleteInvite]
  )

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

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void navigate({ to: "/admin" })}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Invites
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create email-bound invite codes for private beta signups.
          </p>
        </div>
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
        <Button type="submit" className="self-end" disabled={isCreating}>
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

      <InvitesTable
        data={invites}
        onRevoke={(id) => void handleRevoke(id)}
        pendingRevokeId={pendingInviteId}
        onDelete={(id) => void handleDelete(id)}
        pendingDeleteId={pendingDeleteId}
      />
    </section>
  )
}
