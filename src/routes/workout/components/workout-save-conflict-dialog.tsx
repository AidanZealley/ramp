import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface WorkoutSaveConflictDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOverwrite: () => void | Promise<void>
  onGetLatest: () => void
  canGetLatest: boolean
}

export function WorkoutSaveConflictDialog({
  open,
  onOpenChange,
  onOverwrite,
  onGetLatest,
  canGetLatest,
}: WorkoutSaveConflictDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Newer interval changes found</DialogTitle>
          <DialogDescription>
            The workout intervals changed on the server while you were editing.
            You can keep your local draft, overwrite the server version, or adopt
            the latest server intervals.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={onGetLatest}
            disabled={!canGetLatest}
          >
            Get latest
          </Button>
          <Button onClick={() => void onOverwrite()}>Overwrite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
