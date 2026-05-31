import { RotateCcw, Save, Trash2 } from "lucide-react"
import {
  formatActivityDate,
  getActivityPrimaryTimestamp,
  getActivitySourceLabel,
} from "../format"
import type { UnresolvedActivityDialogProps } from "./types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export const UnresolvedActivityDialog = ({
  open,
  activity,
  busy = false,
  onOpenChange,
  onResume,
  onSaveExisting,
  onDiscardExisting,
}: UnresolvedActivityDialogProps) => {
  const handleResume = async () => {
    await onResume()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Activity already in progress</DialogTitle>
          <DialogDescription>
            Finish, save, or discard the existing activity before starting a new
            one.
          </DialogDescription>
        </DialogHeader>

        {activity ? (
          <div className="rounded-lg border bg-background p-3">
            <div className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              {getActivitySourceLabel(activity)} ·{" "}
              {activity.status === "pending" ? "Pending review" : "In progress"}
            </div>
            <div className="mt-1 font-heading text-lg font-semibold">
              {activity.title}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {formatActivityDate(getActivityPrimaryTimestamp(activity))}
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => void onDiscardExisting()}
            disabled={!activity || busy}
          >
            <Trash2 />
            Discard existing
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void onSaveExisting()}
              disabled={!activity || busy}
            >
              <Save />
              Save existing
            </Button>
            <Button
              type="button"
              onClick={() => void handleResume()}
              disabled={!activity || busy}
            >
              <RotateCcw />
              Return to activity
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
