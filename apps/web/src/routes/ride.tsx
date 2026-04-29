import { createFileRoute } from "@tanstack/react-router"
import { RidePage } from "@/components/ride/ride-page"

export const Route = createFileRoute("/ride")({
  component: RidePage,
})
