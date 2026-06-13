import { Bluetooth, Circle, Loader2, RadioTower, X } from "lucide-react"
import { getAutoConnectMessage, isAutoConnectActive } from "./utils"
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

  const autoMessage = getAutoConnectMessage(controller)
  const autoActive = isAutoConnectActive(controller)
  const busy =
    controller.connecting || controller.selectingTrainer || autoActive

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

      {autoMessage ? (
        <div className="rounded-lg border border-border/70 bg-muted/60 p-3 text-sm">
          <div className="flex items-start gap-2">
            {autoActive ? (
              <Loader2 className="mt-0.5 size-4 animate-spin text-primary" />
            ) : (
              <RadioTower className="mt-0.5 size-4 text-muted-foreground" />
            )}
            <div className="grid gap-2">
              <p>{autoMessage}</p>
              {autoActive ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => void controller.autoConnect.cancel()}
                >
                  <X data-icon="inline-start" />
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {!controller.bleAvailable ? (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Web Bluetooth requires a Chromium-class browser.
        </p>
      ) : null}

      {controller.connectionError ? (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {controller.connectionError}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          disabled={!controller.bleAvailable || busy}
          onClick={() => void controller.connectTrainer()}
        >
          <Bluetooth data-icon="inline-start" />
          Connect to a device
        </Button>
        {import.meta.env.DEV ? (
          <Button
            type="button"
            variant="secondary"
            disabled={busy || controller.source === "simulated"}
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
