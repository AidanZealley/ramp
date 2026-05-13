import { ArrowLeft } from "lucide-react"
import type { RideConnectionGateProps } from "./types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const WEB_BLUETOOTH_MESSAGE = "Web Bluetooth requires a Chromium-class browser."

export const RideConnectionGate = ({
  experience,
  trainerController,
  onConnected,
}: RideConnectionGateProps) => {
  const primaryText =
    trainerController == null
      ? "Preparing ride"
      : trainerController.selectingTrainer
        ? "Opening Bluetooth"
        : "Connect trainer"
  const primaryDisabled =
    trainerController == null ||
    trainerController.connecting ||
    trainerController.selectingTrainer ||
    !trainerController.bleAvailable
  const simulatorDisabled =
    trainerController == null ||
    trainerController.connecting ||
    trainerController.selectingTrainer

  const handleConnect = async () => {
    if (!trainerController) return
    const connected = await trainerController.connectTrainer()
    if (connected.ok) onConnected()
  }

  const handleUseSimulator = async () => {
    if (!trainerController) return
    const connected = await trainerController.useSimulatorTrainer()
    if (connected.ok) onConnected()
  }

  return (
    <section
      aria-label={`${experience.displayName} connection`}
      className="flex min-h-svh items-center px-4 py-8 text-foreground sm:px-6"
    >
      <div className="mx-auto grid w-full max-w-3xl gap-7">
        <a
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          href="/ride"
        >
          <ArrowLeft className="size-4" />
          Back to rides
        </a>

        <div className="grid gap-3">
          <Badge className="w-fit" variant="secondary">
            Ride setup
          </Badge>
          <div className="grid gap-2">
            <h1 className="font-heading text-3xl font-semibold sm:text-4xl">
              {experience.displayName}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {experience.description}
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {trainerController?.ready && !trainerController.bleAvailable ? (
            <p className="text-sm text-muted-foreground">
              {WEB_BLUETOOTH_MESSAGE}
            </p>
          ) : null}
          {trainerController?.connectionError ? (
            <p className="text-sm font-medium text-destructive">
              {trainerController.connectionError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={primaryDisabled}
            type="button"
            onClick={() => void handleConnect()}
          >
            {primaryText}
          </Button>
          {import.meta.env.DEV ? (
            <Button
              disabled={simulatorDisabled}
              type="button"
              variant="secondary"
              onClick={() => void handleUseSimulator()}
            >
              Use simulator
            </Button>
          ) : null}
          <a
            className={cn(buttonVariants({ variant: "outline" }))}
            href="/ride"
          >
            Back to rides
          </a>
        </div>
      </div>
    </section>
  )
}
