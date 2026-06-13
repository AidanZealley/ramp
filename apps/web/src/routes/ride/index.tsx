import { createFileRoute } from "@tanstack/react-router"
import {
  RideConnectionControl,
  RideConnectionScreen,
} from "@/components/ride/ride-connection-control"
import { RideExperiencePickerPage } from "@/components/ride/ride-experience-picker-page"
import { useRideRuntimeContext } from "@/ride/ride-runtime-context"

export const Route = createFileRoute("/ride/")({
  component: RideLauncherRoute,
})

function RideLauncherRoute() {
  const runtime = useRideRuntimeContext()

  return (
    <RideExperiencePickerPage
      headerAction={<RideConnectionControl runtime={runtime} />}
    >
      {runtime.source === "none" ? <RideConnectionScreen /> : null}
    </RideExperiencePickerPage>
  )
}
