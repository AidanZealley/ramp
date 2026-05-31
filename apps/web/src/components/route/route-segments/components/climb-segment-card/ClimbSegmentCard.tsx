import { Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SegmentElevationPreview } from "@/components/route/route-segments/components/segment-elevation-preview"
import { useUnitFormatters } from "@/hooks/use-unit-formatters"
import type { StoredRouteSegment } from "../../types"

type ClimbSegmentCardProps = {
  segment: StoredRouteSegment
  deleting?: boolean
  onDelete: () => void
}

export const ClimbSegmentCard = ({
  segment,
  deleting = false,
  onDelete,
}: ClimbSegmentCardProps) => {
  const units = useUnitFormatters()

  return (
    <article className="grid gap-4 rounded-lg border border-border/70 p-4 sm:grid-cols-[1fr_220px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Climb</Badge>
            <span className="text-sm text-muted-foreground">
              {units.distance(segment.startDistanceMeters, {
                compactUnderKm: true,
              })}{" "}
              to{" "}
              {units.distance(segment.endDistanceMeters, {
                compactUnderKm: true,
              })}
            </span>
          </div>
          <Button
            aria-label="Delete segment"
            disabled={deleting}
            onClick={onDelete}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 />
          </Button>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Distance</dt>
            <dd className="font-medium">
              {units.distance(segment.distanceMeters, {
                compactUnderKm: true,
              })}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Gain</dt>
            <dd className="font-medium">
              {units.elevation(segment.elevationGainMeters)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Gradient</dt>
            <dd className="font-medium">
              {(segment.averageGradient * 100).toFixed(1)}%
            </dd>
          </div>
        </dl>
      </div>
      <SegmentElevationPreview samples={segment.previewSamples} />
    </article>
  )
}
