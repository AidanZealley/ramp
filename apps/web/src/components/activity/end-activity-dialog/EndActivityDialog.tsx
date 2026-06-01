import { CheckCircle2, Clock, Trash2 } from "lucide-react"
import { ActivitySummaryMetrics } from "../activity-summary-metrics"
import type { EndActivityDialogProps } from "./types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export const EndActivityDialog = ({
  open,
  title,
  description,
  metrics = [],
  busy = false,
  onOpenChange,
  onSaveActivity,
  onCompleteLater,
  onDiscard,
}: EndActivityDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <ActivitySummaryMetrics metrics={metrics} />

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="destructive"
              onClick={() => void onDiscard()}
              disabled={busy}
            >
              <Trash2 />
              Discard
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void onCompleteLater()}
              disabled={busy}
            >
              <Clock />
              Complete later
            </Button>
            <Button
              type="button"
              onClick={() => void onSaveActivity()}
              disabled={busy}
            >
              <CheckCircle2 />
              Save activity
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
