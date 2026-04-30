import { useMemo } from "react"
import { RideSessionContext } from "@ramp/ride-core"
import { createWorkoutController } from "@ramp/ride-workouts"
import type { RideExperienceDefinition } from "@/experiences/types"
import { useRideSessionBootstrap } from "@/ride/use-ride-session-bootstrap"
import { useRideTrainer } from "@/ride/use-ride-trainer"
import { RideOverlay } from "./ride-overlay"

export function RideSessionPage({
  experience,
}: {
  experience: RideExperienceDefinition
}) {
  const trainer = useRideTrainer()
  const { session } = useRideSessionBootstrap(trainer)
  const workoutController = useMemo(
    () => createWorkoutController({ session }),
    [session]
  )

  const ExperienceView = experience.plugin.ExperienceView

  return (
    <RideSessionContext.Provider value={session}>
      <section
        aria-label={`${experience.displayName} ride`}
        className="relative h-svh min-h-[620px] overflow-hidden text-[#14201b]"
        style={{
          background: `linear-gradient(180deg, ${experience.accent.from}, ${experience.accent.to})`,
        }}
      >
        <h1 className="sr-only">{experience.displayName}</h1>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.34),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.18),rgba(18,27,31,0.22))]" />
        <ExperienceView session={session} />
        <RideOverlay
          session={session}
          trainer={trainer}
          workoutController={workoutController}
        />
      </section>
    </RideSessionContext.Provider>
  )
}
