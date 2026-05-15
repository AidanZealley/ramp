import { createFileRoute } from "@tanstack/react-router"
import type { Id } from "#convex/_generated/dataModel"
import { RideExperienceNotFound } from "@/components/ride/ride-experience-not-found"
import { RideSessionPage } from "@/components/ride/ride-session-page"
import { getRideExperienceDefinition } from "@/experiences/catalog"

type RideExperienceSearch = {
  run?: string
  routeId?: Id<"routes">
  workoutId?: Id<"workouts">
}

export function validateRideExperienceSearch(
  search: Record<string, unknown>
): RideExperienceSearch {
  return {
    run: typeof search.run === "string" ? search.run : undefined,
    routeId:
      typeof search.routeId === "string"
        ? (search.routeId as Id<"routes">)
        : undefined,
    workoutId:
      typeof search.workoutId === "string"
        ? (search.workoutId as Id<"workouts">)
        : undefined,
  }
}

export const Route = createFileRoute("/ride/$experienceId")({
  validateSearch: validateRideExperienceSearch,
  component: RideExperienceRoute,
})

function RideExperienceRoute() {
  const { experienceId } = Route.useParams()
  const { routeId, run, workoutId } = Route.useSearch()
  const experience = getRideExperienceDefinition(experienceId)

  if (!experience) {
    return <RideExperienceNotFound experienceId={experienceId} />
  }

  return (
    <RideSessionPage
      key={`${experienceId}:${run ?? "default"}`}
      experience={experience}
      search={{ routeId, workoutId }}
    />
  )
}
