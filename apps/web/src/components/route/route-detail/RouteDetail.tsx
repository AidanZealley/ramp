import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { ArrowLeft, Bike } from "lucide-react"
import type { Id } from "#convex/_generated/dataModel"
import type { ParsedRouteGpx } from "@/lib/routes/types"
import { api } from "#convex/_generated/api"
import { parseRouteGpxText } from "@/lib/routes/gpx"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ElevationChart } from "@/components/route/elevation-chart"
import { RoutePreviewMap } from "@/components/route/route-preview-map"
import { RouteStats } from "@/components/route/route-stats"
import { useUnitFormatters } from "@/hooks/use-unit-formatters"

type RouteDetailProps = {
  routeId: Id<"routes">
}

export const RouteDetail = ({ routeId }: RouteDetailProps) => {
  const routeDoc = useQuery(api.routes.get, { id: routeId })
  const units = useUnitFormatters()
  const [parsedRoute, setParsedRoute] = useState<ParsedRouteGpx | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setParsedRoute(null)
    setParseError(null)

    if (!routeDoc?.fileUrl) return

    void fetch(routeDoc.fileUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Couldn't load GPX file")
        return response.text()
      })
      .then((text) => {
        if (cancelled) return
        const result = parseRouteGpxText(text, routeDoc.originalFileName)
        if (result.kind === "error") {
          setParseError(result.message)
        } else {
          setParsedRoute(result.route)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setParseError(
            error instanceof Error ? error.message : "Couldn't load GPX file"
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [routeDoc])

  if (routeDoc === undefined) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-[420px] rounded-lg" />
      </div>
    )
  }

  if (routeDoc === null) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <Button
          nativeButton={false}
          variant="ghost"
          render={<Link to="/route" />}
        >
          <ArrowLeft />
          Back
        </Button>
        <div className="rounded-lg border border-dashed border-border/70 px-6 py-12 text-center">
          <h1 className="font-heading text-xl font-semibold">
            Route not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This route may have been deleted.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Button
          nativeButton={false}
          variant="ghost"
          render={<Link to="/route" />}
        >
          <ArrowLeft />
          Back
        </Button>
        <Button
          nativeButton={false}
          render={
            <Link
              to="/ride/$experienceId"
              params={{ experienceId: "route" }}
              search={{ routeId: routeDoc._id }}
            />
          }
        >
          <Bike />
          Ride Route
        </Button>
      </div>

      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {routeDoc.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Imported from {routeDoc.originalFileName}
        </p>
      </div>

      <RouteStats stats={routeDoc.stats} />

      {parseError ? (
        <div className="rounded-lg border border-dashed border-border/70 px-6 py-12 text-center text-sm text-muted-foreground">
          {parseError}
        </div>
      ) : parsedRoute ? (
        <>
          <RoutePreviewMap
            geojson={parsedRoute.geojson}
            bounds={routeDoc.bounds}
            start={routeDoc.start}
            finish={routeDoc.finish}
          />
          <ElevationChart
            samples={parsedRoute.elevationSamples}
            unitSystem={units.unitSystem}
          />
        </>
      ) : (
        <>
          <Skeleton className="h-[420px] rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </>
      )}
    </div>
  )
}
