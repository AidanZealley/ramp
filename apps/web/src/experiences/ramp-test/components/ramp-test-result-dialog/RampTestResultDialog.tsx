import { useEffect, useState } from "react"
import { useMutation } from "convex/react"
import { ArrowRight, Check } from "lucide-react"
import type { RampTestResultDialogProps } from "./types"
import { api } from "#convex/_generated/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const MIN_FTP = 50
const MAX_FTP = 500

function clampFtp(ftp: number): number {
  return Math.max(MIN_FTP, Math.min(MAX_FTP, Math.round(ftp)))
}

export const RampTestResultDialog = ({
  open,
  calculatedFtp,
  currentFtp,
  failed,
  busy = false,
  onOpenChange,
  onContinue,
}: RampTestResultDialogProps) => {
  const updatePreferences = useMutation(api.preferences.update)
  const [updating, setUpdating] = useState(false)
  const [updatedFtp, setUpdatedFtp] = useState<number | null>(null)

  useEffect(() => {
    if (open) {
      setUpdatedFtp(null)
    }
  }, [open])

  const canUpdate =
    calculatedFtp !== null && clampFtp(calculatedFtp) !== currentFtp
  const targetFtp = calculatedFtp !== null ? clampFtp(calculatedFtp) : null
  const alreadyUpdated = updatedFtp !== null && updatedFtp === targetFtp

  const handleUpdateFtp = async () => {
    if (targetFtp === null) return
    setUpdating(true)
    try {
      await updatePreferences({ ftp: targetFtp })
      setUpdatedFtp(targetFtp)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ramp test complete</DialogTitle>
          <DialogDescription>
            {failed
              ? "You held the ramp as long as you could — here is your estimated FTP."
              : "You completed the full ramp — here is your estimated FTP."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="rounded-lg border bg-background p-4 text-center">
            <div className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Estimated FTP
            </div>
            <div className="mt-1 font-heading text-5xl font-semibold tabular-nums">
              {calculatedFtp !== null ? `${calculatedFtp}W` : "--"}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Current FTP {currentFtp}W
            </div>
          </div>

          {targetFtp !== null ? (
            <Button
              type="button"
              variant={alreadyUpdated ? "outline" : "default"}
              onClick={() => void handleUpdateFtp()}
              disabled={updating || alreadyUpdated || (!canUpdate && !alreadyUpdated)}
              className="w-full"
            >
              {alreadyUpdated ? (
                <>
                  <Check />
                  FTP updated to {updatedFtp}W
                </>
              ) : updating ? (
                "Updating FTP..."
              ) : canUpdate ? (
                `Update FTP to ${targetFtp}W`
              ) : (
                "FTP already up to date"
              )}
            </Button>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => void onContinue()}
            disabled={busy || updating}
          >
            Continue
            <ArrowRight />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
