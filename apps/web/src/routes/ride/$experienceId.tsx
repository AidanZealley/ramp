import { createFileRoute } from "@tanstack/react-router"
import { RideExperienceNotFound } from "@/components/ride/ride-experience-not-found"
import { RideSessionPage } from "@/components/ride/ride-session-page"
import { getRideExperienceDefinition } from "@/experiences/catalog"

type RideExperienceSearch = {
  run?: string
}

export const Route = createFileRoute("/ride/$experienceId")({
  validateSearch: (search): RideExperienceSearch => ({
    run: typeof search.run === "string" ? search.run : undefined,
  }),
  component: RideExperienceRoute,
})

function RideExperienceRoute() {
  const { experienceId } = Route.useParams()
  const { run } = Route.useSearch()
  const experience = getRideExperienceDefinition(experienceId)

  if (!experience) {
    return <RideExperienceNotFound experienceId={experienceId} />
  }

  return (
    <RideSessionPage
      key={`${experienceId}:${run ?? "default"}`}
      experience={experience}
    />
  )
}
