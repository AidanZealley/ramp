import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface DeleteIntervalsDialogProps {
  open: boolean
  selectedCount: number
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteIntervalsDialog({
  open,
  selectedCount,
  onCancel,
  onConfirm,
}: DeleteIntervalsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Delete {selectedCount} interval
            {selectedCount === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            {selectedCount === 1
              ? "this interval"
              : `these ${selectedCount} intervals`}
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
