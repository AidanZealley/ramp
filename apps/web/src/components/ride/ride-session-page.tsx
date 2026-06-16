import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react"
import { RideConnectionDialog } from "./ride-connection-control"
import { RideOverlay } from "./ride-overlay"
import type { Id } from "#convex/_generated/dataModel"
import type { RideExperienceDefinition } from "@/experiences/types"
import type { RideRuntimeController } from "@/ride/use-ride-runtime"
import { useActivitySession } from "@/hooks/activity/use-activity-session"
import { useElementSize } from "@/hooks/use-element-size"
import { useRideRuntimeContext } from "@/ride/ride-runtime-context"

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
  const runtime = useRideRuntimeContext()
  const activity = useActivitySession({ activityId: search?.activityId })
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false)
  const connectionDialogOpenedRef = useRef(false)

  useEffect(() => {
    if (
      runtime.ready &&
      runtime.session &&
      runtime.source === "none" &&
      !connectionDialogOpenedRef.current
    ) {
      connectionDialogOpenedRef.current = true
      setConnectionDialogOpen(true)
    }
  }, [runtime.ready, runtime.session, runtime.source])

  if (!runtime.ready || runtime.session === null) {
    return (
      <section className="flex min-h-svh items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Preparing ride...</p>
      </section>
    )
  }

  return (
    <>
      <RideSessionExperience
        experience={experience}
        activity={activity}
        search={search}
        trainerController={runtime as ReadyRideRuntimeController}
      />
      <RideConnectionDialog
        open={connectionDialogOpen && runtime.source === "none"}
        onOpenChange={setConnectionDialogOpen}
      />
    </>
  )
}

function RideSessionExperience({
  experience,
  activity,
  search,
  trainerController,
}: {
  experience: RideExperienceDefinition
  activity: ReturnType<typeof useActivitySession>
  search?: RideExperienceSearchProps
  trainerController: ReadyRideRuntimeController
}) {
  const { connection, session } = trainerController
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
              session={session}
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
        onHeaderHeightChange={setOverlayHeaderHeight}
        trainerController={trainerController}
      />
    </section>
  )
}
