import { Link, Outlet } from "@tanstack/react-router"
import { useAuthActions } from "@convex-dev/auth/react"
import { useQuery } from "convex/react"
import { LogOut, TriangleRight } from "lucide-react"
import { api } from "#convex/_generated/api"
import { AppNav } from "@/components/app-nav"
import { ModeToggle } from "@/components/mode-toggle"
import { SettingsDialog } from "@/components/settings-dialog"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"

type AuthenticatedAppShellProps = {
  rideImmersive: boolean
  workoutsActive: boolean
  plansActive: boolean
  routeActive: boolean
  rideActive: boolean
}

export const AuthenticatedAppShell = ({
  rideImmersive,
  workoutsActive,
  plansActive,
  routeActive,
  rideActive,
}: AuthenticatedAppShellProps) => {
  const currentUser = useQuery(api.auth.currentUser)
  const { signOut } = useAuthActions()
  const userLabel = currentUser?.email ?? currentUser?.name ?? null

  return (
    <div className="flex min-h-svh flex-col">
      {!rideImmersive && (
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/50 px-4 backdrop-blur-lg">
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
                workoutsActive={workoutsActive}
                plansActive={plansActive}
                routeActive={routeActive}
                rideActive={rideActive}
              />
            </div>

            <div className="flex items-center gap-3">
              {userLabel ? (
                <span className="hidden max-w-48 truncate text-sm text-muted-foreground sm:block">
                  {userLabel}
                </span>
              ) : null}
              <ModeToggle />
              <SettingsDialog />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Sign out"
                onClick={() => void signOut()}
              >
                <LogOut />
              </Button>
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
