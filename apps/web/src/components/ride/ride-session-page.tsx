import { Suspense, lazy, useMemo, useState } from "react"
import { RideSessionContext } from "@ramp/ride-core"
import { RideConnectionGate } from "./ride-connection-gate"
import { RideOverlay } from "./ride-overlay"
import type { Id } from "#convex/_generated/dataModel"
import type { RideExperienceDefinition } from "@/experiences/types"
import { useElementSize } from "@/hooks/use-element-size"
import { useRideSessionBootstrap } from "@/ride/use-ride-session-bootstrap"
import { useRideTrainer } from "@/ride/use-ride-trainer"

type RideExperienceSearchProps = {
  workoutId?: Id<"workouts">
}

export function RideSessionPage({
  experience,
  search,
}: {
  experience: RideExperienceDefinition
  search?: RideExperienceSearchProps
}) {
  const trainerController = useRideTrainer()
  const { trainer } = trainerController
  const [connectionConfirmed, setConnectionConfirmed] = useState(false)
  const { session } = useRideSessionBootstrap(
    connectionConfirmed ? trainer : null
  )

  if (!connectionConfirmed) {
    return (
      <RideConnectionGate
        experience={experience}
        trainerController={trainerController}
        onConnected={() => setConnectionConfirmed(true)}
      />
    )
  }

  return (
    <RideSessionExperience
      experience={experience}
      onDisconnected={() => setConnectionConfirmed(false)}
      search={search}
      session={session}
      trainerController={trainerController}
    />
  )
}

function RideSessionExperience({
  experience,
  onDisconnected,
  search,
  session,
  trainerController,
}: {
  experience: RideExperienceDefinition
  onDisconnected: () => void
  search?: RideExperienceSearchProps
  session: ReturnType<typeof useRideSessionBootstrap>["session"]
  trainerController: ReturnType<typeof useRideTrainer>
}) {
  const [isCockpitOpen, setIsCockpitOpen] = useState(false)
  const [cockpitHeight, setCockpitHeight] = useState(0)
  const [overlayHeaderHeight, setOverlayHeaderHeight] = useState(0)
  const { ref: sectionRef, size: sectionSize } = useElementSize<HTMLElement>()
  const ExperienceView = useMemo(
    () =>
      lazy(async () => {
        const plugin = await experience.loadPlugin()
        return { default: plugin.ExperienceView }
      }),
    [experience]
  )
  const experienceInset = isCockpitOpen ? 16 : 0
  const experienceTopInset = isCockpitOpen
    ? overlayHeaderHeight + experienceInset
    : 0
  const experienceBottomInset = 0
  const experienceScale =
    isCockpitOpen && sectionSize.height > 0
      ? Math.max(
          (sectionSize.height -
            cockpitHeight -
            experienceTopInset -
            experienceBottomInset) /
            sectionSize.height,
          0.5
        )
      : 1
  const experienceHeight =
    isCockpitOpen && cockpitHeight > 0
      ? `calc(100svh - ${cockpitHeight}px)`
      : "100svh"
  return (
    <RideSessionContext.Provider value={session}>
      <section
        ref={sectionRef}
        aria-label={`${experience.displayName} ride`}
        className="relative h-svh min-h-[620px] overflow-hidden"
        data-cockpit-open={isCockpitOpen}
      >
        <h1 className="sr-only">{experience.displayName}</h1>
        <div
          className="absolute inset-x-0 top-0 flex justify-center overflow-visible transition-[height,padding] duration-300 ease-out"
          style={{
            height: experienceHeight,
            paddingTop: experienceTopInset,
            paddingRight: experienceInset,
            paddingBottom: experienceBottomInset,
            paddingLeft: experienceInset,
          }}
        >
          <div
            className="relative h-svh w-screen shrink-0 overflow-hidden shadow-[0_18px_44px_rgba(0,0,0,0.22)] transition-[border-radius,transform] duration-300 ease-out"
            style={{
              borderRadius: isCockpitOpen ? 18 : 0,
              transform: `scale(${experienceScale})`,
              transformOrigin: "top center",
            }}
          >
            <Suspense fallback={null}>
              <ExperienceView session={session} search={search} />
            </Suspense>
          </div>
        </div>
        <RideOverlay
          isCockpitOpen={isCockpitOpen}
          onCockpitHeightChange={setCockpitHeight}
          onCockpitOpenChange={setIsCockpitOpen}
          onDisconnected={onDisconnected}
          onHeaderHeightChange={setOverlayHeaderHeight}
          trainerController={trainerController}
        />
      </section>
    </RideSessionContext.Provider>
  )
}
