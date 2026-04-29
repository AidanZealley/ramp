import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface WorkoutDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onConfirmDelete: () => void | Promise<void>
}

export function WorkoutDeleteDialog({
  open,
  onOpenChange,
  title,
  onConfirmDelete,
}: WorkoutDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Workout</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{title}&rdquo;? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button variant="destructive" onClick={() => void onConfirmDelete()}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
