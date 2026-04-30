import { countrysideGame } from "@ramp/game-countryside-r3f"
import { hillClimbGame } from "@ramp/game-hill-climb"
import type { RideGameDefinition } from "./types"

export const rideGames: Array<RideGameDefinition> = [
  {
    id: countrysideGame.id,
    displayName: countrysideGame.displayName,
    description:
      "Cruise an endless countryside road with a reactive 3D world and live terrain grade.",
    tags: ["3D scenery", "free ride", "workout compatible"],
    accent: {
      from: "#d7f0c7",
      to: "#66a36f",
      ink: "#132018",
    },
    preview: {
      eyebrow: "Open roads",
      spotlight: "Reactive R3F scenery",
    },
    plugin: countrysideGame,
  },
  {
    id: hillClimbGame.id,
    displayName: hillClimbGame.displayName,
    description:
      "Attack an authored summit with grade changes, stage markers, and a proper finish summary.",
    tags: ["climbing", "2.5D profile", "workout compatible"],
    accent: {
      from: "#ffe38a",
      to: "#ff7b44",
      ink: "#24150f",
    },
    preview: {
      eyebrow: "Summit run",
      spotlight: "Authored climbing stage",
    },
    plugin: hillClimbGame,
  },
]

export const defaultGameId = countrysideGame.id

export const gameRegistry: Record<string, RideGameDefinition> = Object.fromEntries(
  rideGames.map((game) => [game.id, game])
)

export function getRideGameDefinition(gameId: string) {
  return gameRegistry[gameId] ?? null
}
