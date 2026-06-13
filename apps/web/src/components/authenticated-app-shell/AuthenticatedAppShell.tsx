import { Link, Outlet } from "@tanstack/react-router"
import { TriangleRight } from "lucide-react"
import { AppNav } from "@/components/app-nav"
import { ModeToggle } from "@/components/mode-toggle"
import { AccountDropdown } from "@/components/account-dropdown"
import { Toaster } from "@/components/ui/sonner"

type AuthenticatedAppShellProps = {
  activityActive: boolean
  rideImmersive: boolean
  workoutsActive: boolean
  plansActive: boolean
  routeActive: boolean
  rideActive: boolean
}

export const AuthenticatedAppShell = ({
  activityActive,
  rideImmersive,
  workoutsActive,
  plansActive,
  routeActive,
  rideActive,
}: AuthenticatedAppShellProps) => {
  return (
    <div className="flex min-h-svh flex-col">
      {!rideImmersive && (
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/50 px-4 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <Link
                to="/"
                className="flex items-center gap-0.5 transition-opacity hover:opacity-80"
              >
                <TriangleRight className="-mt-1 size-4" strokeWidth={4} />
                <span className="font-heading text-lg font-semibold tracking-tight">
                  Ramp
                </span>
              </Link>

              <AppNav
                activityActive={activityActive}
                workoutsActive={workoutsActive}
                plansActive={plansActive}
                routeActive={routeActive}
                rideActive={rideActive}
              />
            </div>

            <div className="flex items-center gap-3">
              <ModeToggle />
              <AccountDropdown />
            </div>
          </div>
        </header>
      )}
      <main
        className={rideImmersive ? "w-full flex-1" : "w-full flex-1 px-4 py-6"}
      >
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
