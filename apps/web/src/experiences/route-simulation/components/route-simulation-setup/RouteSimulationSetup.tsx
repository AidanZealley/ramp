import { AlertTriangle, Loader2, Play, RouteIcon } from "lucide-react"
import type { Doc, Id } from "#convex/_generated/dataModel"
import { formatMetricDistance } from "../../utils"
import { Button } from "@/components/ui/button"
import { RouteMap } from "@/components/route/route-map"
import { RouteMini } from "@/components/route/route-mini"
import type { ParsedRouteGpx } from "@/lib/routes/types"

type RouteSimulationSetupProps = {
  isLoading: boolean
  loadError: string | null
  onSelectRoute: (routeId: Id<"routes">) => void
  onStart: () => void
  routes: Array<Doc<"routes">>
  parsedRoute: ParsedRouteGpx | null
  selectedRouteId: Id<"routes"> | null
  startDisabledReason: string | null
  title: string | null
}

export const RouteSimulationSetup = ({
  isLoading,
  loadError,
  onSelectRoute,
  onStart,
  parsedRoute,
  routes,
  selectedRouteId,
  startDisabledReason,
  title,
}: RouteSimulationSetupProps) => {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-background px-4 pt-16 pb-8 sm:px-8 sm:pt-20">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-h-[420px] rounded-lg border border-border/70 bg-card p-4">
          <div className="flex items-center gap-2">
            <RouteIcon className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-semibold">
              {title ?? "Choose a route"}
            </h2>
          </div>
          {loadError && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="size-4" />
              {loadError}
            </div>
          )}
          {parsedRoute && (
            <RouteMap
              bounds={parsedRoute.bounds}
              finish={parsedRoute.finish}
              geojson={parsedRoute.geojson}
              riderPosition={parsedRoute.start}
              start={parsedRoute.start}
              className="mt-4 h-[360px] overflow-hidden rounded-lg border border-border/70 bg-muted"
            />
          )}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading routes
              </div>
            ) : routes.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
                No saved GPX routes yet.
              </div>
            ) : (
              routes.map((route) => (
                <button
                  key={route._id}
                  type="button"
                  onClick={() => onSelectRoute(route._id)}
                  className="rounded-lg border border-border/70 bg-background p-3 text-left transition hover:border-primary/60 data-selected:border-primary data-selected:ring-2 data-selected:ring-primary/20"
                  data-selected={route._id === selectedRouteId}
                >
                  <RouteMini
                    previewPoints={route.previewPoints}
                    className="mb-3 h-16"
                  />
                  <div className="truncate font-heading text-sm font-semibold">
                    {route.title}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatMetricDistance(route.stats.distanceMeters)}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
        <aside className="rounded-lg border border-border/70 bg-card p-4">
          <h3 className="font-heading text-base font-semibold">Ride setup</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Trainer simulation grade is driven from GPX elevation. Progress uses
            trainer speed.
          </p>
          {startDisabledReason && (
            <p className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
              {startDisabledReason}
            </p>
          )}
          <Button
            className="mt-4 w-full"
            disabled={Boolean(startDisabledReason)}
            onClick={onStart}
          >
            <Play />
            Start
          </Button>
        </aside>
      </div>
    </div>
  )
}
