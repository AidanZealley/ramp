import { createFileRoute } from "@tanstack/react-router"
import { RouteLibrary } from "@/components/route/route-library"

export const Route = createFileRoute("/route/")({
  component: RouteListPage,
})

function RouteListPage() {
  return <RouteLibrary />
}
