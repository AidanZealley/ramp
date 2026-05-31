import { Mountain, RouteIcon } from "lucide-react"
import type { Doc } from "#convex/_generated/dataModel"
import { Card, CardContent } from "@/components/ui/card"
import { RouteMini } from "@/components/route/route-mini"
import { useUnitFormatters } from "@/hooks/use-unit-formatters"

type RouteCardProps = {
  routeDoc: Doc<"routes">
  onClick: () => void
}

export const RouteCard = ({ routeDoc, onClick }: RouteCardProps) => {
  const units = useUnitFormatters()
  return (
    <Card
      size="sm"
      className="group cursor-pointer py-0! transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/20"
      onClick={onClick}
    >
      <CardContent className="flex flex-col gap-3 px-0!">
        <div className="border-b bg-background/50 px-3 pt-3">
          <RouteMini previewPoints={routeDoc.previewPoints} className="h-16" />
        </div>
        <div className="px-3 pb-3">
          <h3 className="font-heading text-sm leading-tight font-medium">
            {routeDoc.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <RouteIcon className="size-3.5 text-foreground/70" />
              <span>{units.distance(routeDoc.stats.distanceMeters)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mountain className="size-3.5 text-foreground/70" />
              <span>
                {units.elevation(routeDoc.stats.elevationGainMeters)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
