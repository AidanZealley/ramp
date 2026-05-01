import { memo } from "react"
import { CheckCircle2, ChevronRight } from "lucide-react"
import { formatDuration } from "@/lib/workout-utils"

export type UpcomingPreviewItem = {
  durationSeconds: number
  label: string
  targetWatts: number
}

export const UpcomingPreview = memo(function UpcomingPreview({
  isComplete,
  upcoming,
}: {
  isComplete: boolean
  upcoming: UpcomingPreviewItem | null
}) {
  if (isComplete) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
        <CheckCircle2 className="size-4" />
        Workout complete - trainer is back in free ride.
      </div>
    )
  }

  if (!upcoming) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
        <ChevronRight className="size-4" />
        Final segment in progress.
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 px-3 py-2">
      <ChevronRight className="size-4 text-foreground/70" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[0.6rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Up next
        </span>
        <span className="truncate text-sm font-medium text-foreground">
          {upcoming.label}
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[0.6rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {formatDuration(upcoming.durationSeconds)}
        </span>
        <span className="font-heading text-sm font-semibold tabular-nums">
          {upcoming.targetWatts} W
        </span>
      </div>
    </div>
  )
})
