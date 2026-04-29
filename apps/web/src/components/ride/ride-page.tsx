import { useEffect, useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { RideSessionContext } from "@ramp/ride-core"
import { createWorkoutController } from "@ramp/ride-workouts"
import { api } from "#convex/_generated/api"
import { defaultGameId, gameRegistry } from "@/games/registry"
import { toWorkoutDefinition } from "@/ride/convex-workout-mapper"
import { useRideSessionBootstrap } from "@/ride/use-ride-session-bootstrap"
import { useRideTrainer } from "@/ride/use-ride-trainer"
import { RideOverlay } from "./ride-overlay"

export function RidePage() {
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
  const GameView = gameRegistry[defaultGameId].GameView
  const ftpWatts = settings?.ftp ?? 150

  useEffect(() => {
    if (!selectedWorkoutId && rideWorkouts.length > 0) {
      setSelectedWorkoutId(rideWorkouts[0].id)
    }
  }, [rideWorkouts, selectedWorkoutId])

  return (
    <RideSessionContext.Provider value={session}>
      <section className="relative h-svh min-h-[620px] overflow-hidden bg-[#b9d6d0] text-[#14201b]">
        <div className="ride-world-fallback" aria-hidden="true">
          <div className="ride-world-fallback__field ride-world-fallback__field--left" />
          <div className="ride-world-fallback__field ride-world-fallback__field--right" />
          <div className="ride-world-fallback__road" />
          <div className="ride-world-fallback__road-line" />
          <div className="ride-world-fallback__tree ride-world-fallback__tree--one" />
          <div className="ride-world-fallback__tree ride-world-fallback__tree--two" />
          <div className="ride-world-fallback__tree ride-world-fallback__tree--three" />
        </div>
        <GameView session={session} />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0)_34%,rgba(34,46,38,0.22))]" />
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
