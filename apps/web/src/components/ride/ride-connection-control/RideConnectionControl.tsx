import { Bluetooth, ChevronDown, Circle, Loader2, Power } from "lucide-react"
import { ConnectionStatus } from "./ConnectionStatus"
import { getConnectionState, getConnectionTriggerLabel } from "./utils"
import type { RideConnectionControlProps } from "./types"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useOptionalRideRuntimeContext } from "@/ride/ride-runtime-context"
import { cn } from "@/lib/utils"

export const RideConnectionControl = ({
  runtime,
  onDisconnect,
  className,
}: RideConnectionControlProps) => {
  const contextRuntime = useOptionalRideRuntimeContext()
  const controller = runtime ?? contextRuntime
  if (!controller) return null

  const state = getConnectionState(controller)
  const busy = state.status === "selecting" || state.status === "connecting"
  const connected = controller.source !== "none"

  const handleDisconnect = async () => {
    if (onDisconnect) {
      await onDisconnect()
      return
    }
    await controller.disconnectTrainer()
  }

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="secondary" className={className} />}
      >
        {busy ? <Loader2 className="animate-spin" /> : null}
        {getConnectionTriggerLabel(controller.source)}
        <ChevronDown data-icon="inline-end" />
      </PopoverTrigger>
      <PopoverContent align="start" className="grid gap-3">
        <ConnectionStatus runtime={controller} />

        <div className="grid gap-1">
          <Button
            variant="ghost"
            className="justify-start"
            disabled={!controller.bleAvailable || busy}
            onClick={() => void controller.connectTrainer()}
          >
            <Bluetooth className="size-4" />
            {connected ? "Change connection" : "Connect to a device"}
          </Button>
          {import.meta.env.DEV ? (
            <Button
              variant="ghost"
              className="justify-start"
              disabled={busy || controller.source === "simulated"}
              onClick={() => void controller.useSimulatorTrainer()}
            >
              <Circle
                className={cn(
                  "size-4 fill-transparent",
                  controller.source === "simulated" &&
                    "fill-emerald-500 text-emerald-500"
                )}
              />
              Simulated Trainer
            </Button>
          ) : null}
          {connected ? (
            <Button
              variant="ghost"
              className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={busy}
              onClick={() => void handleDisconnect()}
            >
              <Power className="size-4" />
              Disconnect
            </Button>
          ) : null}
        </div>

        {!controller.bleAvailable ? (
          <p className="text-sm text-muted-foreground">
            Web Bluetooth requires a Chromium-class browser.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
