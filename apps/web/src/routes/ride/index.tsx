import { createFileRoute } from "@tanstack/react-router"
import { RideGamePickerPage } from "@/components/ride/ride-game-picker-page"

export const Route = createFileRoute("/ride/")({
  component: RideLauncherRoute,
})

function RideLauncherRoute() {
  return <RideGamePickerPage />
}
