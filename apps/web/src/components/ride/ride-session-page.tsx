import { Suspense, lazy, useMemo, useState } from "react"
import { RideSessionContext } from "@ramp/ride-react"
import { RideConnectionGate } from "./ride-connection-gate"
import { RideOverlay } from "./ride-overlay"
import type { Id } from "#convex/_generated/dataModel"
import type { RideExperienceDefinition } from "@/experiences/types"
import type { RideRuntimeController } from "@/ride/use-ride-runtime"
import { useActivitySession } from "@/hooks/activity/use-activity-session"
import { useElementSize } from "@/hooks/use-element-size"
import { narrowForExperience } from "@/ride/experience-session"
import { useRideRuntime } from "@/ride/use-ride-runtime"

type RideExperienceSearchProps = {
  activityId?: Id<"activities">
  workoutId?: Id<"workouts">
  routeId?: Id<"routes">
  routeSegmentId?: Id<"routeSegments">
}

type ReadyRideRuntimeController = RideRuntimeController & {
  ready: true
  session: NonNullable<RideRuntimeController["session"]>
}

export function RideSessionPage({
  experience,
  search,
}: {
  experience: RideExperienceDefinition
  search?: RideExperienceSearchProps
}) {
  const runtime = useRideRuntime()
  const activity = useActivitySession({ activityId: search?.activityId })
  const [connectionConfirmed, setConnectionConfirmed] = useState(false)

  if (!connectionConfirmed || !runtime.ready || runtime.session === null) {
    return (
      <RideConnectionGate
        experience={experience}
        trainerController={runtime.ready ? runtime : null}
        onConnected={() => setConnectionConfirmed(true)}
      />
    )
  }

  return (
    <RideSessionExperience
      experience={experience}
      activity={activity}
      onDisconnected={() => setConnectionConfirmed(false)}
      search={search}
      trainerController={runtime as ReadyRideRuntimeController}
    />
  )
}

function RideSessionExperience({
  experience,
  activity,
  onDisconnected,
  search,
  trainerController,
}: {
  experience: RideExperienceDefinition
  activity: ReturnType<typeof useActivitySession>
  onDisconnected: () => void
  search?: RideExperienceSearchProps
  trainerController: ReadyRideRuntimeController
}) {
  const { connection, session } = trainerController
  const experienceSession = useMemo(
    () => narrowForExperience(session),
    [session]
  )
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
              <ExperienceView
                session={
                  experience.id === "diagnostics" ? session : experienceSession
                }
                connection={connection}
                activity={activity}
                search={search}
              />
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
