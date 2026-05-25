import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { UserPreferencesForm } from "@/components/user-preferences-form"

type PreferencesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PreferencesDialog({
  open,
  onOpenChange,
}: PreferencesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription>
            Configure your training profile.
          </DialogDescription>
        </DialogHeader>
        <UserPreferencesForm onSave={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
