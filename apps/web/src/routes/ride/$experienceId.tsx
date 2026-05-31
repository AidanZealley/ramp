import { createFileRoute } from "@tanstack/react-router"
import type { Id } from "#convex/_generated/dataModel"
import { RideExperienceNotFound } from "@/components/ride/ride-experience-not-found"
import { RideSessionPage } from "@/components/ride/ride-session-page"
import { getRideExperienceDefinition } from "@/experiences/catalog"

type RideExperienceSearch = {
  activityId?: Id<"activities">
  run?: string
  routeId?: Id<"routes">
  routeSegmentId?: Id<"routeSegments">
  workoutId?: Id<"workouts">
}

export function validateRideExperienceSearch(
  search: Record<string, unknown>
): RideExperienceSearch {
  return {
    activityId:
      typeof search.activityId === "string"
        ? (search.activityId as Id<"activities">)
        : undefined,
    run: typeof search.run === "string" ? search.run : undefined,
    routeId:
      typeof search.routeId === "string"
        ? (search.routeId as Id<"routes">)
        : undefined,
    routeSegmentId:
      typeof search.routeSegmentId === "string"
        ? (search.routeSegmentId as Id<"routeSegments">)
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
  const { activityId, routeId, routeSegmentId, run, workoutId } =
    Route.useSearch()
  const experience = getRideExperienceDefinition(experienceId)

  if (!experience) {
    return <RideExperienceNotFound experienceId={experienceId} />
  }

  return (
    <RideSessionPage
      key={`${experienceId}:${run ?? "default"}`}
      experience={experience}
      search={{ activityId, routeId, routeSegmentId, workoutId }}
    />
  )
}
