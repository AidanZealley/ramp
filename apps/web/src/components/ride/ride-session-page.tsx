import { useMemo } from "react"
import { RideSessionContext } from "@ramp/ride-core"
import { createWorkoutController } from "@ramp/ride-workouts"
import type { RideGameDefinition } from "@/games/types"
import { useRideSessionBootstrap } from "@/ride/use-ride-session-bootstrap"
import { useRideTrainer } from "@/ride/use-ride-trainer"
import { RideOverlay } from "./ride-overlay"

export function RideSessionPage({ game }: { game: RideGameDefinition }) {
  const trainer = useRideTrainer()
  const { session } = useRideSessionBootstrap(trainer)
  const workoutController = useMemo(
    () => createWorkoutController({ session }),
    [session]
  )

  const GameView = game.plugin.GameView

  return (
    <RideSessionContext.Provider value={session}>
      <section
        aria-label={`${game.displayName} ride`}
        className="relative h-svh min-h-[620px] overflow-hidden text-[#14201b]"
        style={{
          background: `linear-gradient(180deg, ${game.accent.from}, ${game.accent.to})`,
        }}
      >
        <h1 className="sr-only">{game.displayName}</h1>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.34),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.18),rgba(18,27,31,0.22))]" />
        <GameView session={session} />
        <RideOverlay
          session={session}
          trainer={trainer}
          workoutController={workoutController}
        />
      </section>
    </RideSessionContext.Provider>
  )
}
