import { createFileRoute } from "@tanstack/react-router"
import { AdminInvites } from "@/components/admin-invites"

export const Route = createFileRoute("/admin/invites")({
  component: AdminInvites,
})
