import { Pause, Play } from "lucide-react"
import { RangeControl } from "./components/range-control"
import { SectionHeader } from "./components/section-header"
import type { RiderPowerMode } from "@ramp/trainer-io"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type RideSimulatorControlsProps = {
  powerWatts: number
  cadenceRpm: number
  paused: boolean
  powerMode: RiderPowerMode
  onPowerChange: (powerWatts: number) => void
  onCadenceChange: (cadenceRpm: number) => void
  onPauseToggle: () => void
  onPowerModeChange: (mode: RiderPowerMode) => void
}

export function RideSimulatorControls({
  cadenceRpm,
  onCadenceChange,
  onPauseToggle,
  onPowerChange,
  paused,
  powerMode,
  powerWatts,
  onPowerModeChange,
}: RideSimulatorControlsProps) {
  return (
    <div className="grid gap-3 p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Control mode
          </div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            Simulator
          </div>
          <div className="text-sm text-muted-foreground">
            {Math.round(powerWatts)} W · {Math.round(cadenceRpm)} rpm
          </div>
        </div>
        <Button
          aria-label={paused ? "Resume ride" : "Pause ride"}
          className="shrink-0"
          size="icon-sm"
          type="button"
          variant={paused ? "default" : "secondary"}
          onClick={onPauseToggle}
        >
          {paused ? <Play /> : <Pause />}
        </Button>
      </div>

      <div className="grid gap-3 border-t border-border/60 pt-3">
        <SectionHeader
          description={
            powerMode === "erg-auto"
              ? "ERG auto follows the trainer target; moving power switches to manual."
              : "Adjust simulator output directly."
          }
          eyebrow="Live tuning"
          title="Manual inputs"
        />
        <div className="space-y-4">
          <ToggleGroup
            aria-label="Power mode"
            className="w-full"
            size="sm"
            variant="outline"
            value={[powerMode]}
            onValueChange={(value) => {
              const next = value[0]
              if (next === "manual" || next === "erg-auto") {
                onPowerModeChange(next)
              }
            }}
          >
            <ToggleGroupItem className="flex-1" value="erg-auto">
              Auto ERG
            </ToggleGroupItem>
            <ToggleGroupItem className="flex-1" value="manual">
              Manual
            </ToggleGroupItem>
          </ToggleGroup>
          <RangeControl
            label="Power"
            max={700}
            min={0}
            onChange={onPowerChange}
            step={5}
            unit="W"
            value={powerWatts}
          />
          <RangeControl
            label="Cadence"
            max={130}
            min={40}
            onChange={onCadenceChange}
            step={1}
            unit="rpm"
            value={cadenceRpm}
          />
        </div>
      </div>
    </div>
  )
}
