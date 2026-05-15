import { WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"

type RouteDisconnectedOverlayProps = {
  onReconnect?: () => void
  onStop: () => void
}

export const RouteDisconnectedOverlay = ({
  onReconnect,
  onStop,
}: RouteDisconnectedOverlayProps) => {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-border/70 bg-card p-5 text-center shadow-xl">
        <WifiOff className="mx-auto size-7 text-destructive" />
        <h2 className="mt-3 font-heading text-lg font-semibold">
          Trainer disconnected
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Route progress is paused until the trainer reconnects.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          {onReconnect && <Button onClick={onReconnect}>Reconnect</Button>}
          <Button variant="outline" onClick={onStop}>
            Stop
          </Button>
        </div>
      </div>
    </div>
  )
}
