import { useEffect, useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { RideSessionContext } from "@ramp/ride-core"
import { createWorkoutController } from "@ramp/ride-workouts"
import type { RideGameDefinition } from "@/games/types"
import { api } from "#convex/_generated/api"
import { toWorkoutDefinition } from "@/ride/convex-workout-mapper"
import { useRideSessionBootstrap } from "@/ride/use-ride-session-bootstrap"
import { useRideTrainer } from "@/ride/use-ride-trainer"
import { RideOverlay } from "./ride-overlay"

export function RideSessionPage({ game }: { game: RideGameDefinition }) {
  const workouts = useQuery(api.workouts.list)
  const settings = useQuery(api.settings.get)
  const trainer = useRideTrainer()
  const { session } = useRideSessionBootstrap(trainer)
  const workoutController = useMemo(
    () => createWorkoutController({ session }),
    [session]
  )
  const [selectedWorkoutId, setSelectedWorkoutId] = useState("")
  const rideWorkouts = useMemo(
    () => workouts?.map(toWorkoutDefinition) ?? [],
    [workouts]
  )
  const ftpWatts = settings?.ftp ?? 150

  useEffect(() => {
    if (!selectedWorkoutId && rideWorkouts.length > 0) {
      setSelectedWorkoutId(rideWorkouts[0].id)
    }
  }, [rideWorkouts, selectedWorkoutId])

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
          ftpWatts={ftpWatts}
          onWorkoutChange={setSelectedWorkoutId}
          selectedWorkoutId={selectedWorkoutId}
          session={session}
          trainer={trainer}
          workoutController={workoutController}
          workouts={rideWorkouts}
        />
      </section>
    </RideSessionContext.Provider>
  )
}
