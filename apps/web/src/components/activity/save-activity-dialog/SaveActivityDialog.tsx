import { useEffect, useState } from "react"
import { Save, Trash2 } from "lucide-react"
import { ActivitySummaryMetrics } from "../activity-summary-metrics"
import type { SaveActivityDialogProps } from "./types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const SaveActivityDialog = ({
  open,
  defaultTitle,
  description,
  metrics = [],
  children,
  saving = false,
  discarding = false,
  onOpenChange,
  onSave,
  onDiscard,
}: SaveActivityDialogProps) => {
  const [title, setTitle] = useState(defaultTitle)

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle)
    }
  }, [defaultTitle, open])

  const trimmedTitle = title.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save activity</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="activity-title">Title</Label>
            <Input
              id="activity-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <ActivitySummaryMetrics metrics={metrics} />
          {children}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => void onDiscard()}
            disabled={saving || discarding}
          >
            <Trash2 />
            {discarding ? "Discarding" : "Discard"}
          </Button>
          <Button
            type="button"
            onClick={() => void onSave(trimmedTitle)}
            disabled={!trimmedTitle || saving || discarding}
          >
            <Save />
            {saving ? "Saving" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
