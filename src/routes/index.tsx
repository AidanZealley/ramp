import { createFileRoute, Link } from "@tanstack/react-router"
import { buttonVariants } from "@/components/ui/button"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="flex min-h-[calc(100svh-8rem)] items-center justify-center">
      <div className="max-w-2xl space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            Build and tune structured erg workouts
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Start in the workout library now. This home screen stays light so it
            can grow into a dashboard later.
          </p>
        </div>

        <div>
          <Link to="/workout" className={buttonVariants({ size: "lg" })}>
            Open Workouts
          </Link>
        </div>
      </div>
    </div>
  )
}
