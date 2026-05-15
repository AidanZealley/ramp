import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/route")({
  component: RouteLayout,
})

function RouteLayout() {
  return <Outlet />
}
