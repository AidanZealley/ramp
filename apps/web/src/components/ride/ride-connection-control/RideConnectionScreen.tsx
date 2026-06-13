import {
  AlertCircle,
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  Circle,
  Loader2,
  Pointer,
  X,
} from "lucide-react"
import { getConnectionState } from "./utils"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRideRuntimeContext } from "@/ride/ride-runtime-context"

const backgroundTiles = Array.from({ length: 6 }, (_, index) => index)

export const RideConnectionScreen = () => {
  const runtime = useRideRuntimeContext()
  const state = getConnectionState(runtime)
  const busy = state.status === "selecting" || state.status === "connecting"
  const canCancel = runtime.connectionView.canCancel
  const canConnectBle = runtime.connectionView.canConnectBle
  const canUseSimulator = runtime.connectionView.canUseSimulator
  const statusContent = getStatusContent(state)

  return (
    <section className="relative flex min-h-88 items-center justify-center overflow-hidden px-4 py-10 text-center sm:min-h-[min(34rem,58svh)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto grid max-w-5xl grid-cols-1 gap-6 opacity-45 sm:grid-cols-2"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 45%, transparent 82%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 45%, transparent 82%, transparent 100%)",
        }}
      >
        {backgroundTiles.map((tile) => (
          <div
            key={tile}
            className="h-40 rounded-3xl border border-border/40 bg-muted/35"
          />
        ))}
      </div>
      <div className="relative z-10 grid w-full max-w-md justify-items-center gap-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-168 -translate-x-1/2 -translate-y-1/2 bg-radial-[closest-side_at_center] from-background/50 to-transparent"
        />
        <statusContent.Icon
          className={cn("size-10", statusContent.iconClassName)}
        />
        <div className="grid gap-2">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            {statusContent.title}
          </h2>
          <p
            className={cn(
              "text-sm leading-6 text-muted-foreground",
              state.status === "failed" && "text-destructive"
            )}
          >
            {statusContent.description}
          </p>
        </div>
        {!runtime.bleAvailable ? (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Web Bluetooth requires a Chromium-class browser.
          </p>
        ) : null}
        <div className="flex flex-wrap justify-center gap-2">
          {busy && canCancel ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => void runtime.cancelConnection()}
            >
              <X data-icon="inline-start" />
              Cancel
            </Button>
          ) : null}
          {!busy ? (
            <>
              <Button
                type="button"
                disabled={!canConnectBle}
                onClick={() => void runtime.connectTrainer()}
              >
                <Bluetooth data-icon="inline-start" />
                {state.status === "failed"
                  ? "Try again"
                  : "Connect to a device"}
              </Button>
              {import.meta.env.DEV ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={runtime.source === "simulated" || !canUseSimulator}
                  onClick={() => void runtime.useSimulatorTrainer()}
                >
                  <Circle
                    data-icon="inline-start"
                    className={cn(
                      "fill-transparent",
                      runtime.source === "simulated" &&
                        "fill-emerald-500 text-emerald-500"
                    )}
                  />
                  Simulated Trainer
                </Button>
              ) : null}
            </>
          ) : null}
          {busy && !canCancel ? (
            <Button type="button" disabled>
              <Loader2 data-icon="inline-start" className="animate-spin" />
              Connecting
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function getStatusContent(state: ReturnType<typeof getConnectionState>) {
  switch (state.status) {
    case "selecting":
      return {
        Icon: Pointer,
        iconClassName: "text-foreground",
        title: "Select a trainer",
        description: "Choose a Bluetooth trainer from the browser prompt.",
      }
    case "connecting":
      return {
        Icon: Loader2,
        iconClassName: "animate-spin text-foreground",
        title: "Connecting trainer",
        description: `Connecting to ${state.trainerName}.`,
      }
    case "connected":
      return {
        Icon: BluetoothConnected,
        iconClassName: "text-emerald-500",
        title: "Trainer connected",
        description: `Connected to ${state.trainerName}.`,
      }
    case "failed":
      return {
        Icon: AlertCircle,
        iconClassName: "text-destructive",
        title: "Trainer connection failed",
        description: state.message,
      }
    case "idle":
      return {
        Icon: BluetoothOff,
        iconClassName: "text-muted-foreground",
        title: "Trainer not connected",
        description: "Connect to a trainer to begin riding.",
      }
  }
}
