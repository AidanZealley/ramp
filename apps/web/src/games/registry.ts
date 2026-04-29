import { countrysideGame } from "@ramp/game-countryside-r3f"
import type { RideGamePlugin } from "@ramp/ride-core"

export const defaultGameId = countrysideGame.id

export const gameRegistry: Record<string, RideGamePlugin> = {
  [countrysideGame.id]: countrysideGame,
}
