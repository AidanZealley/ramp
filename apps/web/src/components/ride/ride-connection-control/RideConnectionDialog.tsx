import { RideConnectionPanel } from "./RideConnectionPanel"
import { getConnectionState } from "./utils"
import type { RideConnectionDialogProps } from "./types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRideRuntimeContext } from "@/ride/ride-runtime-context"

export const RideConnectionDialog = ({
  open,
  onOpenChange,
}: RideConnectionDialogProps) => {
  const runtime = useRideRuntimeContext()

  const handleOpenChange = (nextOpen: boolean) => {
    const state = getConnectionState(runtime)
    if (
      !nextOpen &&
      (state.status === "selecting" || state.status === "connecting")
    ) {
      void runtime.cancelConnection()
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect trainer</DialogTitle>
          <DialogDescription>
            This ride can load now. Connect a trainer when you are ready to
            start.
          </DialogDescription>
        </DialogHeader>
        <RideConnectionPanel runtime={runtime} compact />
      </DialogContent>
    </Dialog>
  )
}
