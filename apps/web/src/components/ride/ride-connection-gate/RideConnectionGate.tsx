import { Activity, ArrowLeft, Bluetooth } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import type { RideTrainerConnectionChoice } from "@/ride/use-ride-trainer"
import type React from "react"
import type { RideConnectionGateProps } from "./types"

const WEB_BLUETOOTH_MESSAGE = "Web Bluetooth requires a Chromium-class browser."

export const RideConnectionGate = ({
  experience,
  trainerController,
  onConnected,
}: RideConnectionGateProps) => {
  const selectedSource = trainerController.selectedSource
  const primaryText =
    selectedSource === "simulated"
      ? "Start with simulator"
      : trainerController.selectingBleTrainer
        ? "Opening Bluetooth"
        : "Connect trainer"
  const primaryDisabled =
    trainerController.connecting ||
    selectedSource == null ||
    (selectedSource === "ble" && !trainerController.bleAvailable)

  const handleConnect = async () => {
    const connected = await trainerController.connectSelectedTrainer()
    if (connected) onConnected()
  }

  const handleSourceChange = (value: Array<string>) => {
    const nextSource = value[0]
    if (nextSource === "simulated" || nextSource === "ble") {
      trainerController.selectSource(nextSource)
    }
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
          <div className="text-sm font-medium">Trainer source</div>
          <ToggleGroup
            aria-label="Trainer source"
            variant="outline"
            className="grid w-full grid-cols-1 sm:grid-cols-2"
            size="lg"
            value={selectedSource ? [selectedSource] : []}
            onValueChange={handleSourceChange}
          >
            {trainerController.devSimulationEnabled ? (
              <SourceOption
                description="Use generated ride telemetry for local development."
                icon={<Activity />}
                label="Simulator"
                selected={selectedSource === "simulated"}
                value="simulated"
              />
            ) : null}
            <SourceOption
              description={
                trainerController.bleAvailable
                  ? "Pair with an FTMS Bluetooth trainer."
                  : WEB_BLUETOOTH_MESSAGE
              }
              disabled={!trainerController.bleAvailable}
              icon={<Bluetooth />}
              label="Bluetooth trainer"
              selected={selectedSource === "ble"}
              value="ble"
            />
          </ToggleGroup>
          {!trainerController.bleAvailable ? (
            <p className="text-sm text-muted-foreground">
              {WEB_BLUETOOTH_MESSAGE}
            </p>
          ) : null}
          {trainerController.connectionError ? (
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

function SourceOption({
  description,
  disabled,
  icon,
  label,
  selected,
  value,
}: {
  description: string
  disabled?: boolean
  icon: React.ReactNode
  label: string
  selected: boolean
  value: RideTrainerConnectionChoice
}) {
  return (
    <ToggleGroupItem
      aria-label={label}
      className="h-auto min-h-24 items-start justify-start rounded-lg px-4 py-3 text-left data-[state=on]:bg-primary/10"
      disabled={disabled}
      value={value}
    >
      <span className="flex min-w-0 items-start gap-3">
        <span
          className={`mt-0.5 rounded-md border p-2 ${
            selected
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </span>
        <span className="grid min-w-0 gap-1">
          <span className="font-medium text-foreground">{label}</span>
          <span className="text-sm leading-5 whitespace-normal text-muted-foreground">
            {description}
          </span>
        </span>
      </span>
    </ToggleGroupItem>
  )
}
