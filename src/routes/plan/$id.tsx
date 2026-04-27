import { createFileRoute } from "@tanstack/react-router"
import type { Id } from "../../../convex/_generated/dataModel"
import { PlanEditor } from "@/components/plan-editor/plan-editor"

export const Route = createFileRoute("/plan/$id")({
  component: PlanPage,
})

function PlanPage() {
  const { id } = Route.useParams()

  return <PlanEditor planId={id as Id<"plans">} />
}
