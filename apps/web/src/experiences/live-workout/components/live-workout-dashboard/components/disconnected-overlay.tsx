import { RefreshCw, Square, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"

type DisconnectedOverlayProps = {
  onReconnect: () => void
  onEnd: () => void
  errorCopy: string | null
}

export function DisconnectedOverlay({
  onReconnect,
  onEnd,
  errorCopy,
}: DisconnectedOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border bg-card p-6 text-center shadow-xl">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <WifiOff className="size-6 text-destructive" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-lg font-semibold">
            Trainer Disconnected
          </h3>
          <p className="text-sm text-muted-foreground">
            {errorCopy ?? "The connection to your trainer was lost."}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onEnd}>
            <Square data-icon="inline-start" />
            End workout
          </Button>
          <Button onClick={onReconnect}>
            <RefreshCw data-icon="inline-start" />
            Reconnect
          </Button>
        </div>
      </div>
    </div>
  )
}
