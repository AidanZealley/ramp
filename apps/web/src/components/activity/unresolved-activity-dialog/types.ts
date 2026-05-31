import type { ActivityClientDoc } from "../types"

export type UnresolvedActivityDialogProps = {
  open: boolean
  activity: ActivityClientDoc | null
  busy?: boolean
  onOpenChange: (open: boolean) => void
  onResume: () => void | Promise<void>
  onSaveExisting: () => void | Promise<void>
  onDiscardExisting: () => void | Promise<void>
}
