import { Bluetooth, Circle } from "lucide-react"
import { ConnectionStatus } from "./ConnectionStatus"
import { getConnectionState } from "./utils"
import type { RideConnectionPanelProps } from "./types"
import { Button } from "@/components/ui/button"
import { useOptionalRideRuntimeContext } from "@/ride/ride-runtime-context"
import { cn } from "@/lib/utils"

export const RideConnectionPanel = ({
  runtime,
  compact = false,
  hideIntro = false,
}: RideConnectionPanelProps) => {
  const contextRuntime = useOptionalRideRuntimeContext()
  const controller = runtime ?? contextRuntime
  if (!controller) return null

  const state = getConnectionState(controller)
  const busy = state.status === "selecting" || state.status === "connecting"
  const connectionView = controller.connectionView

  return (
    <div className={cn("grid gap-4", compact && "gap-3")}>
      {!hideIntro ? (
        <div className="grid gap-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Trainer connection
          </h2>
          <p className="text-sm text-muted-foreground">
            Connect a Bluetooth trainer to start riding. The simulator is
            available in development builds.
          </p>
        </div>
      ) : null}

      <ConnectionStatus runtime={controller} />

      {!controller.bleAvailable ? (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Web Bluetooth requires a Chromium-class browser.
        </p>
      ) : null}

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          disabled={
            !(connectionView?.canConnectBle ?? controller.bleAvailable) || busy
          }
          onClick={() => void controller.connectTrainer()}
        >
          <Bluetooth data-icon="inline-start" />
          Connect to a device
        </Button>
        {import.meta.env.DEV ? (
          <Button
            type="button"
            variant="secondary"
            disabled={
              busy ||
              controller.source === "simulated" ||
              connectionView?.canUseSimulator === false
            }
            onClick={() => void controller.useSimulatorTrainer()}
          >
            <Circle
              data-icon="inline-start"
              className={cn(
                "fill-transparent",
                controller.source === "simulated" &&
                  "fill-emerald-500 text-emerald-500"
              )}
            />
            Simulated Trainer
          </Button>
        ) : null}
      </div>
    </div>
  )
}
