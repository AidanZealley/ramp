import { Link } from "@tanstack/react-router"
import type { WorkoutCompleteDialogProps } from "./types"
import { formatDistance } from "./utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { formatDuration } from "@/lib/workout-utils"
import { ArrowLeft, Pencil } from "lucide-react"

export const WorkoutCompleteDialog = ({
  open,
  workoutId,
  workoutTitle,
  summary,
  onOpenChange,
}: WorkoutCompleteDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Workout complete!</DialogTitle>
          <DialogDescription>
            {workoutTitle} is complete. Nice work.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-background p-3">
            <div className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Time
            </div>
            <div className="mt-1 font-heading text-2xl font-semibold tabular-nums">
              {formatDuration(summary.durationSeconds)}
            </div>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <div className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Distance
            </div>
            <div className="mt-1 font-heading text-2xl font-semibold tabular-nums">
              {formatDistance(summary.distanceMeters)}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Link
            className={cn(buttonVariants({ variant: "outline" }))}
            to="/ride"
          >
            <ArrowLeft className="size-4" />
            Back to rides
          </Link>
          <Link
            className={cn(buttonVariants({ variant: "default" }))}
            to="/workout/$id"
            params={{ id: workoutId }}
          >
            <Pencil className="size-4" />
            Edit workout
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
