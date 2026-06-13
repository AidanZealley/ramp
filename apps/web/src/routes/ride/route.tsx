import { Outlet, createFileRoute } from "@tanstack/react-router"
import { useEffect } from "react"
import { RideSessionContext } from "@ramp/ride-react"
import { RideRuntimeProvider } from "@/ride/ride-runtime-context"
import { useRideRuntime } from "@/ride/use-ride-runtime"

export const Route = createFileRoute("/ride")({
  component: RideLayout,
})

function RideLayout() {
  const runtime = useRideRuntime()

  useEffect(() => {
    const cleanup = () => {
      void runtime.session?.dispose()
    }
    const handlePageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) cleanup()
    }

    window.addEventListener("pagehide", handlePageHide)
    window.addEventListener("beforeunload", cleanup)
    return () => {
      window.removeEventListener("pagehide", handlePageHide)
      window.removeEventListener("beforeunload", cleanup)
    }
  }, [runtime.session])

  const content = (
    <RideRuntimeProvider value={runtime}>
      <Outlet />
    </RideRuntimeProvider>
  )

  if (!runtime.session) return content

  return (
    <RideSessionContext.Provider value={runtime.session}>
      {content}
    </RideSessionContext.Provider>
  )
}
