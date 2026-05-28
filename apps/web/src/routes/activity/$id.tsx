import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { ArrowLeft, Bike, ExternalLink } from "lucide-react"
import type { Id } from "#convex/_generated/dataModel"
import { api } from "#convex/_generated/api"
import {
  formatActivityDate,
  formatActivityDistance,
  formatActivityDuration,
  formatActivityElevation,
  getActivityPrimaryTimestamp,
  getActivitySourceLabel,
} from "@/components/activity/format"
import { ActivitySummaryMetrics } from "@/components/activity/activity-summary-metrics"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RouteMini } from "@/components/route/route-mini"
import { WorkoutMini } from "@/components/workout-mini"

export const Route = createFileRoute("/activity/$id")({
  params: {
    parse: (params) => ({ id: params.id as Id<"activities"> }),
    stringify: (params) => ({ id: params.id }),
  },
  component: ActivityDetailPage,
})

function ActivityDetailPage() {
  const { id } = Route.useParams()
  const activity = useQuery(api.activities.get, { activityId: id })
  const workout = useQuery(
    api.workouts.get,
    activity?.sourceSnapshot.kind === "workout"
      ? { id: activity.sourceSnapshot.workoutId }
      : "skip"
  )
  const route = useQuery(
    api.routes.get,
    activity?.sourceSnapshot.kind === "route"
      ? { id: activity.sourceSnapshot.routeId }
      : "skip"
  )

  if (activity === undefined) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (activity === null) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <Button
          nativeButton={false}
          variant="ghost"
          render={<Link to="/activity" />}
        >
          <ArrowLeft />
          Back
        </Button>
        <div className="rounded-lg border border-dashed border-border/70 px-6 py-12 text-center">
          <h1 className="font-heading text-xl font-semibold">
            Activity not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This activity may have been discarded.
          </p>
        </div>
      </div>
    )
  }

  const snapshot = activity.sourceSnapshot
  const summary = activity.summary
  const metrics = [
    {
      label: "Duration",
      value: formatActivityDuration(summary.durationSeconds),
    },
    {
      label: "Distance",
      value: formatActivityDistance(summary.distanceMeters),
    },
    ...(summary.plannedAverageWatts != null
      ? [
          {
            label: "Planned",
            value: `${Math.round(summary.plannedAverageWatts)}W`,
          },
        ]
      : []),
    ...(summary.elevationGainMeters != null
      ? [
          {
            label: "Climb",
            value: formatActivityElevation(summary.elevationGainMeters),
          },
        ]
      : []),
    ...(summary.completionPercent != null
      ? [
          {
            label: "Complete",
            value: `${Math.round(summary.completionPercent)}%`,
          },
        ]
      : []),
  ]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Button
          nativeButton={false}
          variant="ghost"
          render={<Link to="/activity" />}
        >
          <ArrowLeft />
          Back
        </Button>
        <div className="flex gap-2">
          {snapshot.kind === "workout" && workout ? (
            <>
              <Button
                nativeButton={false}
                variant="outline"
                render={
                  <Link to="/workout/$id" params={{ id: snapshot.workoutId }} />
                }
              >
                <ExternalLink />
                Workout
              </Button>
              <Button
                nativeButton={false}
                render={
                  <Link
                    to="/ride/$experienceId"
                    params={{ experienceId: "live-workout" }}
                    search={{ workoutId: snapshot.workoutId }}
                  />
                }
              >
                <Bike />
                Ride workout
              </Button>
            </>
          ) : null}
          {snapshot.kind === "route" && route ? (
            <>
              <Button
                nativeButton={false}
                variant="outline"
                render={
                  <Link to="/route/$id" params={{ id: snapshot.routeId }} />
                }
              >
                <ExternalLink />
                Route
              </Button>
              <Button
                nativeButton={false}
                render={
                  <Link
                    to="/ride/$experienceId"
                    params={{ experienceId: "route" }}
                    search={{ routeId: snapshot.routeId }}
                  />
                }
              >
                <Bike />
                Ride route
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div>
        <div className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {getActivitySourceLabel(activity)} ·{" "}
          {formatActivityDate(getActivityPrimaryTimestamp(activity))}
        </div>
        <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
          {activity.title}
        </h1>
      </div>

      <ActivitySummaryMetrics metrics={metrics} />

      <section className="grid gap-3">
        <h2 className="font-heading text-lg font-semibold">Snapshot</h2>
        {snapshot.kind === "workout" ? (
          <div className="grid gap-3 rounded-lg border bg-background p-4">
            <div>
              <div className="font-heading text-xl font-semibold">
                {snapshot.title}
              </div>
              <p className="text-sm text-muted-foreground">
                FTP {snapshot.ftpAtStart}W · revision{" "}
                {snapshot.intervalsRevision}
              </p>
            </div>
            <WorkoutMini intervals={snapshot.intervals} className="h-40" />
          </div>
        ) : (
          <div className="grid gap-3 rounded-lg border bg-background p-4">
            <div>
              <div className="font-heading text-xl font-semibold">
                {snapshot.title}
              </div>
              <p className="text-sm text-muted-foreground">
                Imported from {snapshot.originalFileName}
              </p>
            </div>
            <RouteMini
              previewPoints={snapshot.previewPoints}
              className="h-32"
            />
            <ActivitySummaryMetrics
              metrics={[
                {
                  label: "Route distance",
                  value: formatActivityDistance(snapshot.stats.distanceMeters),
                },
                {
                  label: "Gain",
                  value: formatActivityElevation(
                    snapshot.stats.elevationGainMeters
                  ),
                },
                {
                  label: "Loss",
                  value: formatActivityElevation(
                    snapshot.stats.elevationLossMeters
                  ),
                },
              ]}
            />
          </div>
        )}
      </section>
    </div>
  )
}
