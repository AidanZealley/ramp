import { Mountain, RouteIcon, Waypoints } from "lucide-react"
import type { RouteStatsSnapshot } from "@/lib/routes/types"
import { formatRouteDistance, formatRouteElevation } from "@/lib/routes/format"

type RouteStatsProps = {
  stats: RouteStatsSnapshot
}

export const RouteStats = ({ stats }: RouteStatsProps) => {
  const items = [
    {
      label: "Distance",
      value: formatRouteDistance(stats.distanceMeters),
      icon: RouteIcon,
    },
    {
      label: "Climbing",
      value: formatRouteElevation(stats.elevationGainMeters),
      icon: Mountain,
    },
    {
      label: "Points",
      value: stats.pointCount.toLocaleString(),
      icon: Waypoints,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border/70 bg-card px-4 py-3"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <item.icon className="size-3.5 text-foreground/70" />
            {item.label}
          </div>
          <div className="mt-1 font-heading text-xl font-semibold tracking-tight">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}
