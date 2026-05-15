import { createFileRoute } from "@tanstack/react-router"
import type { Id } from "#convex/_generated/dataModel"
import { RouteDetail } from "@/components/route/route-detail"

export const Route = createFileRoute("/route/$id")({
  params: {
    parse: (params) => ({ id: params.id as Id<"routes"> }),
    stringify: (params) => ({ id: params.id }),
  },
  component: RouteDetailPage,
})

function RouteDetailPage() {
  const { id } = Route.useParams()

  return <RouteDetail routeId={id} />
}
