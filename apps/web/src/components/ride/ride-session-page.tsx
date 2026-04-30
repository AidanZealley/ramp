import { lazy, Suspense, useMemo } from "react"
import { RideSessionContext } from "@ramp/ride-core"
import { RideOverlay } from "./ride-overlay"
import type { RideExperienceDefinition } from "@/experiences/types"
import { useRideSessionBootstrap } from "@/ride/use-ride-session-bootstrap"
import { useRideTrainer } from "@/ride/use-ride-trainer"

export function RideSessionPage({
  experience,
}: {
  experience: RideExperienceDefinition
}) {
  const trainer = useRideTrainer()
  const { session } = useRideSessionBootstrap(trainer)
  const ExperienceView = useMemo(
    () =>
      lazy(async () => {
        const plugin = await experience.loadPlugin()
        return { default: plugin.ExperienceView }
      }),
    [experience]
  )

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
        <Suspense fallback={null}>
          <ExperienceView session={session} />
        </Suspense>
        <RideOverlay session={session} trainer={trainer} />
      </section>
    </RideSessionContext.Provider>
  )
}
