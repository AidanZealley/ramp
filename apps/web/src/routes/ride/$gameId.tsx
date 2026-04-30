import { createFileRoute } from "@tanstack/react-router"
import { RideGameNotFound } from "@/components/ride/ride-game-not-found"
import { RideSessionPage } from "@/components/ride/ride-session-page"
import { getRideGameDefinition } from "@/games/registry"

type RideGameSearch = {
  run?: string
}

export const Route = createFileRoute("/ride/$gameId")({
  validateSearch: (search): RideGameSearch => ({
    run: typeof search.run === "string" ? search.run : undefined,
  }),
  component: RideGameRoute,
})

function RideGameRoute() {
  const { gameId } = Route.useParams()
  const { run } = Route.useSearch()
  const game = getRideGameDefinition(gameId)

  if (!game) {
    return <RideGameNotFound gameId={gameId} />
  }

  return <RideSessionPage key={`${gameId}:${run ?? "default"}`} game={game} />
}
