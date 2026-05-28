import { Link } from "@tanstack/react-router"
import {
  Activity,
  Calendar,
  Gauge,
  Mountain,
  RouteIcon,
  Timer,
} from "lucide-react"
import type { ActivityCardProps } from "./types"
import {
  formatActivityDate,
  formatActivityDistance,
  formatActivityDuration,
  formatActivityElevation,
  getActivityPrimaryTimestamp,
  getActivitySourceLabel,
} from "../format"
import { Card, CardContent } from "@/components/ui/card"

export const ActivityCard = ({ activity, actions }: ActivityCardProps) => {
  const summary = activity.summary
  return (
    <Card size="sm" className="py-0!">
      <CardContent className="flex flex-col gap-3 p-4!">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              <Activity className="size-3.5" />
              <span>{getActivitySourceLabel(activity)}</span>
              {activity.status !== "completed" ? (
                <span>
                  {activity.status === "pending" ? "Pending" : "Open"}
                </span>
              ) : null}
            </div>
            <Link
              to="/activity/$id"
              params={{ id: activity._id }}
              className="mt-1 block truncate font-heading text-lg font-semibold tracking-tight hover:underline"
            >
              {activity.title}
            </Link>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground sm:grid-cols-3">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-4 text-foreground/70" />
            {formatActivityDate(getActivityPrimaryTimestamp(activity))}
          </span>
          <span className="flex items-center gap-1.5">
            <Timer className="size-4 text-foreground/70" />
            {formatActivityDuration(summary.durationSeconds)}
          </span>
          <span className="flex items-center gap-1.5">
            <RouteIcon className="size-4 text-foreground/70" />
            {formatActivityDistance(summary.distanceMeters)}
          </span>
          {summary.plannedAverageWatts != null ? (
            <span className="flex items-center gap-1.5">
              <Gauge className="size-4 text-foreground/70" />
              {Math.round(summary.plannedAverageWatts)}W
            </span>
          ) : null}
          {summary.elevationGainMeters != null ? (
            <span className="flex items-center gap-1.5">
              <Mountain className="size-4 text-foreground/70" />
              {formatActivityElevation(summary.elevationGainMeters)}
            </span>
          ) : null}
          {summary.completionPercent != null &&
          summary.completionPercent < 100 ? (
            <span>{Math.round(summary.completionPercent)}% complete</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
