import { Mountain, RouteIcon, Waypoints } from "lucide-react"
import type { RouteStatsSnapshot } from "@/lib/routes/types"
import { useUnitFormatters } from "@/hooks/use-unit-formatters"

type RouteStatsProps = {
  stats: RouteStatsSnapshot
}

export const RouteStats = ({ stats }: RouteStatsProps) => {
  const units = useUnitFormatters()
  const items = [
    {
      label: "Distance",
      value: units.distance(stats.distanceMeters),
      icon: RouteIcon,
    },
    {
      label: "Climbing",
      value: units.elevation(stats.elevationGainMeters),
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
