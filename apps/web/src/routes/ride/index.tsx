import { createFileRoute } from "@tanstack/react-router"
import { RideExperiencePickerPage } from "@/components/ride/ride-experience-picker-page"

export const Route = createFileRoute("/ride/")({
  component: RideLauncherRoute,
})

function RideLauncherRoute() {
  return <RideExperiencePickerPage />
}
