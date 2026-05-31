import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { ArrowLeft, Bike } from "lucide-react"
import { toast } from "sonner"
import type { Id } from "#convex/_generated/dataModel"
import type { ParsedRouteGpx } from "@/lib/routes/types"
import type { StoredRouteSegment } from "@/components/route/route-segments/types"
import { api } from "#convex/_generated/api"
import { parseRouteGpxText } from "@/lib/routes/gpx"
import { detectRouteSegments } from "@/lib/routes/segments"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ElevationChart } from "@/components/route/elevation-chart"
import { RoutePreviewMap } from "@/components/route/route-preview-map"
import { RouteSegments } from "@/components/route/route-segments"
import { RouteStats } from "@/components/route/route-stats"
import { useUnitFormatters } from "@/hooks/use-unit-formatters"

type RouteDetailProps = {
  routeId: Id<"routes">
}

export const RouteDetail = ({ routeId }: RouteDetailProps) => {
  const routeDoc = useQuery(api.routes.get, { id: routeId })
  const routeSegments = useQuery(api.routeSegments.listByRoute, { routeId })
  const replaceRouteSegments = useMutation(api.routeSegments.replaceForRoute)
  const deleteRouteSegment = useMutation(api.routeSegments.deleteOne)
  const units = useUnitFormatters()
  const [parsedRoute, setParsedRoute] = useState<ParsedRouteGpx | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [generatingSegments, setGeneratingSegments] = useState(false)
  const [segmentToDelete, setSegmentToDelete] =
    useState<StoredRouteSegment | null>(null)
  const [deletingSegmentId, setDeletingSegmentId] = useState<string | null>(
    null
  )

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

  const handleGenerateSegments = async () => {
    if (!parsedRoute) return
    const hasElevation = parsedRoute.points.some(
      (point) =>
        point.elevationMeters !== null && Number.isFinite(point.elevationMeters)
    )
    if (!hasElevation) {
      toast.error("No elevation data available to generate segments")
      return
    }

    setGeneratingSegments(true)
    try {
      const segments = detectRouteSegments(parsedRoute.points)
      await replaceRouteSegments({ routeId, segments })
      if (segments.length === 0) {
        toast.success("No climb segments found")
      } else {
        toast.success(
          `Generated ${segments.length} segment${segments.length === 1 ? "" : "s"}`
        )
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't generate segments"
      )
    } finally {
      setGeneratingSegments(false)
    }
  }

  const handleDeleteSegment = async () => {
    if (!segmentToDelete) return

    setDeletingSegmentId(segmentToDelete._id)
    try {
      await deleteRouteSegment({ segmentId: segmentToDelete._id })
      toast.success("Deleted segment")
      setSegmentToDelete(null)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't delete segment"
      )
    } finally {
      setDeletingSegmentId(null)
    }
  }

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

      <RouteSegments
        routeId={routeDoc._id}
        segments={routeSegments}
        canGenerate={Boolean(parsedRoute)}
        generating={generatingSegments}
        deletingSegmentId={deletingSegmentId}
        onGenerate={handleGenerateSegments}
        onDeleteSegment={setSegmentToDelete}
      />

      <AlertDialog
        open={segmentToDelete !== null}
        onOpenChange={(open) => {
          if (!open && deletingSegmentId === null) setSegmentToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete segment?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the selected segment from this route. You can
              regenerate segments later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSegmentId !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingSegmentId !== null}
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteSegment()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
