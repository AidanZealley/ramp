import { useState } from "react"
import { RefreshCw } from "lucide-react"
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
import { ClimbSegmentCard } from "./components/climb-segment-card"
import type { StoredRouteSegment } from "./types"

type RouteSegmentsProps = {
  segments: Array<StoredRouteSegment> | undefined
  canGenerate: boolean
  generating?: boolean
  deletingSegmentId?: string | null
  onGenerate: () => void
  onDeleteSegment: (segment: StoredRouteSegment) => void
}

export const RouteSegments = ({
  segments,
  canGenerate,
  generating = false,
  deletingSegmentId = null,
  onGenerate,
  onDeleteSegment,
}: RouteSegmentsProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const sortedSegments = segments
    ? [...segments].sort(
        (a, b) => a.startDistanceMeters - b.startDistanceMeters
      )
    : []
  const hasSegments = sortedSegments.length > 0
  const buttonLabel = hasSegments ? "Regenerate Segments" : "Generate Segments"
  const disabled = segments === undefined || !canGenerate || generating

  const handleGenerateClick = () => {
    if (hasSegments) {
      setConfirmOpen(true)
      return
    }
    onGenerate()
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold">Segments</h2>
        <Button onClick={handleGenerateClick} disabled={disabled}>
          <RefreshCw className={generating ? "animate-spin" : undefined} />
          {buttonLabel}
        </Button>
      </div>

      {segments === undefined ? (
        <div className="grid gap-3">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      ) : hasSegments ? (
        <div className="grid gap-3">
          {sortedSegments.map((segment) => {
            switch (segment.type) {
              case "climb":
                return (
                  <ClimbSegmentCard
                    key={segment._id}
                    segment={segment}
                    deleting={deletingSegmentId === segment._id}
                    onDelete={() => onDeleteSegment(segment)}
                  />
                )
            }
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/70 px-6 py-10 text-center text-sm text-muted-foreground">
          No segments stored for this route.
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate segments?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces all stored segments for this route with newly
              detected climb segments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false)
                onGenerate()
              }}
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
