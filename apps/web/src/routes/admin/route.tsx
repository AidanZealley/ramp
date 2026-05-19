import { useQuery } from "convex/react"
import { Outlet, createFileRoute } from "@tanstack/react-router"
import { api } from "#convex/_generated/api"
import { Spinner } from "@/components/ui/spinner"

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
})

export function AdminLayout() {
  const currentUser = useQuery(api.auth.currentUser)

  if (currentUser === undefined) {
    return (
      <section className="mx-auto max-w-xl">
        <Spinner className="text-muted-foreground" />
      </section>
    )
  }

  if (currentUser?.role !== "admin") {
    return (
      <section className="mx-auto max-w-xl">
        <h1 className="font-heading text-2xl font-semibold">Unauthorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have access to admin tools.
        </p>
      </section>
    )
  }

  return <Outlet />
}
