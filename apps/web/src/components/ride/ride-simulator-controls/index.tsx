import { Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RangeControl } from "./components/range-control"
import { SectionHeader } from "./components/section-header"

type RideSimulatorControlsProps = {
  powerWatts: number
  cadenceRpm: number
  paused: boolean
  onPowerChange(powerWatts: number): void
  onCadenceChange(cadenceRpm: number): void
  onPauseToggle(): void
}

export function RideSimulatorControls({
  cadenceRpm,
  onCadenceChange,
  onPauseToggle,
  onPowerChange,
  paused,
  powerWatts,
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
          description="Adjust simulator output directly."
          eyebrow="Live tuning"
          title="Manual inputs"
        />
        <div className="space-y-4">
          <RangeControl
            label="Power"
            max={600}
            min={0}
            onChange={onPowerChange}
            step={5}
            unit="W"
            value={powerWatts}
          />
          <RangeControl
            label="Cadence"
            max={120}
            min={50}
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
