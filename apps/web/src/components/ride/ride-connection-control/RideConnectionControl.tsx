import {
  Bluetooth,
  ChevronDown,
  Circle,
  Loader2,
  Power,
  RadioTower,
} from "lucide-react"
import {
  getAutoConnectMessage,
  getConnectionTriggerLabel,
  isAutoConnectActive,
} from "./utils"
import type { RideConnectionControlProps } from "./types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

  const autoMessage = getAutoConnectMessage(controller)
  const autoActive = isAutoConnectActive(controller)
  const busy =
    controller.connecting || controller.selectingTrainer || autoActive
  const connected = controller.source !== "none"

  const handleDisconnect = async () => {
    if (onDisconnect) {
      await onDisconnect()
      return
    }
    await controller.disconnectTrainer()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="secondary" className={className} />}
      >
        {getConnectionTriggerLabel(controller.source)}
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {autoMessage ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-start gap-2 whitespace-normal text-foreground">
                {autoActive ? (
                  <Loader2 className="mt-0.5 size-4 animate-spin text-primary" />
                ) : (
                  <RadioTower className="mt-0.5 size-4 text-muted-foreground" />
                )}
                <span>{autoMessage}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            {autoActive ? (
              <DropdownMenuItem
                onClick={() => void controller.autoConnect.cancel()}
              >
                Cancel automatic reconnect
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem
          disabled={!controller.bleAvailable || busy}
          onClick={() => void controller.connectTrainer()}
        >
          <Bluetooth className="size-4" />
          {connected ? "Change connection" : "Connect to a device"}
        </DropdownMenuItem>
        {import.meta.env.DEV ? (
          <DropdownMenuItem
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
          </DropdownMenuItem>
        ) : null}
        {connected ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={busy}
              onClick={() => void handleDisconnect()}
            >
              <Power className="size-4" />
              Disconnect
            </DropdownMenuItem>
          </>
        ) : null}
        {!controller.bleAvailable ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="whitespace-normal">
                Web Bluetooth requires a Chromium-class browser.
              </DropdownMenuLabel>
            </DropdownMenuGroup>
          </>
        ) : null}
        {controller.connectionError ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="whitespace-normal text-destructive">
                {controller.connectionError}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
