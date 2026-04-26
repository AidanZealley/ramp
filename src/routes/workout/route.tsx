import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/workout")({
  component: WorkoutLayout,
})

function WorkoutLayout() {
  return <Outlet />
}
