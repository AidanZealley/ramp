import { Suspense, lazy, useMemo, useState } from "react"
import { RideSessionContext } from "@ramp/ride-core"
import { RideOverlay } from "./ride-overlay"
import type { RideExperienceDefinition } from "@/experiences/types"
import { useElementSize } from "@/hooks/use-element-size"
import { useRideSessionBootstrap } from "@/ride/use-ride-session-bootstrap"
import { useRideTrainer } from "@/ride/use-ride-trainer"

export function RideSessionPage({
  experience,
}: {
  experience: RideExperienceDefinition
}) {
  const trainerController = useRideTrainer()
  const { trainer } = trainerController
  const { session } = useRideSessionBootstrap(trainer)
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
        className="relative h-svh min-h-[620px] overflow-hidden text-[#14201b]"
        data-cockpit-open={isCockpitOpen}
        style={{
          background: `linear-gradient(180deg, ${experience.accent.from}, ${experience.accent.to})`,
        }}
      >
        <h1 className="sr-only">{experience.displayName}</h1>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.34),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.18),rgba(18,27,31,0.22))]" />
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
              <ExperienceView session={session} />
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
    </RideSessionContext.Provider>
  )
}
