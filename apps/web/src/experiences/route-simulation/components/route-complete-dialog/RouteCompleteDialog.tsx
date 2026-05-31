import { formatElapsedTime } from "../../utils"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useUnitFormatters } from "@/hooks/use-unit-formatters"

type RouteCompleteDialogProps = {
  distanceMeters: number
  elapsedSeconds: number
  onOpenChange: (open: boolean) => void
  onRestart: () => void
  open: boolean
  routeTitle: string
}

export const RouteCompleteDialog = ({
  distanceMeters,
  elapsedSeconds,
  onOpenChange,
  onRestart,
  open,
  routeTitle,
}: RouteCompleteDialogProps) => {
  const units = useUnitFormatters()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Route complete</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 text-sm">
          <div className="font-heading text-lg font-semibold">{routeTitle}</div>
          <div className="text-muted-foreground">
            {units.distance(distanceMeters)} in {formatElapsedTime(elapsedSeconds)}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
          <Button onClick={onRestart}>Restart</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
