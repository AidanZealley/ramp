import {
  AlertTriangle,
  ListRestart,
  Loader2,
  Play,
  RouteIcon,
} from "lucide-react"
import type { Id } from "#convex/_generated/dataModel"
import type {
  RouteProgressMode,
  RouteSimulationPreferencesState,
  RouteSimulationRouteState,
} from "../../types"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { RoutePreviewMap } from "@/components/route/route-preview-map"
import { RouteMini } from "@/components/route/route-mini"
import { useUnitFormatters } from "@/hooks/use-unit-formatters"

type RouteSimulationSetupProps = {
  onChangeRoute: () => void
  onProgressModeChange: (mode: RouteProgressMode) => void
  onSelectRoute: (routeId: Id<"routes">) => void
  onStart: () => void
  route: Pick<
    RouteSimulationRouteState,
    | "activeRouteTitle"
    | "isLoading"
    | "loadError"
    | "parsedRoute"
    | "routes"
    | "selectedRouteId"
  >
  preferences: Pick<
    RouteSimulationPreferencesState,
    "physicsProfileReady" | "progressMode"
  >
  startDisabledReason: string | null
  startError?: string | null
}

export const RouteSimulationSetup = ({
  onChangeRoute,
  onProgressModeChange,
  onSelectRoute,
  onStart,
  route,
  preferences,
  startDisabledReason,
  startError,
}: RouteSimulationSetupProps) => {
  const {
    activeRouteTitle,
    isLoading,
    loadError,
    parsedRoute,
    routes,
    selectedRouteId,
  } = route
  const { physicsProfileReady, progressMode } = preferences
  const units = useUnitFormatters()

  return (
    <div className="absolute inset-0 overflow-y-auto bg-background px-4 pt-16 pb-8 sm:px-8 sm:pt-20">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-h-[420px] rounded-lg border border-border/70 bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <RouteIcon className="size-5 shrink-0 text-primary" />
              <h2 className="truncate font-heading text-xl font-semibold">
                {activeRouteTitle ?? "Choose a route"}
              </h2>
            </div>
            <Button
              variant="outline"
              onClick={onChangeRoute}
              disabled={!selectedRouteId}
            >
              <ListRestart />
              Change route
            </Button>
          </div>
          {loadError && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="size-4" />
              {loadError}
            </div>
          )}
          {parsedRoute && (
            <RoutePreviewMap
              bounds={parsedRoute.bounds}
              finish={parsedRoute.finish}
              geojson={parsedRoute.geojson}
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
              routes.map((routeOption) => (
                <button
                  key={routeOption._id}
                  type="button"
                  onClick={() => onSelectRoute(routeOption._id)}
                  className="rounded-lg border border-border/70 bg-background p-3 text-left transition hover:border-primary/60 data-selected:border-primary data-selected:ring-2 data-selected:ring-primary/20"
                  data-selected={routeOption._id === selectedRouteId}
                >
                  <RouteMini
                    previewPoints={routeOption.previewPoints}
                    className="mb-3 h-16"
                  />
                  <div className="truncate font-heading text-sm font-semibold">
                    {routeOption.title}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {units.distance(routeOption.stats.distanceMeters)}
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
            the selected speed source.
          </p>
          <div className="mt-4 grid gap-2">
            <ToggleGroup
              variant="outline"
              value={[progressMode]}
              onValueChange={(values) => {
                const next = values[0] as RouteProgressMode | undefined
                if (next) onProgressModeChange(next)
              }}
              className="grid grid-cols-2"
            >
              <ToggleGroupItem value="trainer-speed">
                Trainer speed
              </ToggleGroupItem>
              <ToggleGroupItem
                value="app-physics"
                disabled={!physicsProfileReady}
              >
                App physics
              </ToggleGroupItem>
            </ToggleGroup>
            {progressMode === "app-physics" && (
              <p className="text-xs text-muted-foreground">
                Uses power, rider weight, and bike weight for virtual speed.
              </p>
            )}
          </div>
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
          {startError ? (
            <p className="mt-3 text-center text-sm text-destructive">
              {startError}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
