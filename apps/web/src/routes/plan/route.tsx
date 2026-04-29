import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/plan")({
  component: PlanLayout,
})

function PlanLayout() {
  return <Outlet />
}
