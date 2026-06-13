import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react"
import { getConnectionState } from "./utils"
import type { RideRuntimeController } from "@/ride/use-ride-runtime"
import { Button } from "@/components/ui/button"

export type ConnectionStatusProps = {
  runtime: RideRuntimeController
}

export const ConnectionStatus = ({ runtime }: ConnectionStatusProps) => {
  const state = getConnectionState(runtime)

  if (state.status === "idle") return null

  const selecting = state.status === "selecting"
  const connecting = state.status === "connecting"
  const connected = state.status === "connected"
  const failed = state.status === "failed"
  const canCancel = runtime.connectionView?.canCancel ?? connecting

  const message = (() => {
    switch (state.status) {
      case "selecting":
        return "Select a device to connect."
      case "connecting":
        return `Connecting to ${state.trainerName}.`
      case "connected":
        return `Connected to ${state.trainerName}.`
      case "failed":
        return state.message
    }
  })()

  return (
    <div className="flex items-start gap-2 text-sm">
      {selecting || connecting ? (
        <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-foreground" />
      ) : connected ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
      ) : failed ? (
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      ) : null}
      <div className="grid gap-2">
        <p className={failed ? "text-destructive" : undefined}>{message}</p>
        {(selecting || connecting) && canCancel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => void runtime.cancelConnection()}
          >
            <X data-icon="inline-start" />
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  )
}
