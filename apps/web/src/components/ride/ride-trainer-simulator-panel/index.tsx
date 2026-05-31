import { useEffect, useState } from "react"
import { Capability as TrainerCapability } from "@ramp/trainer-io"
import { TrainerModeStatus } from "./components/trainer-mode-status"
import { TrainerStateGrid } from "./components/trainer-state-grid"
import type {
  Capability,
  SimulatedTrainer,
  SimulatedTrainerMode,
  SimulatedTrainerState,
} from "@ramp/trainer-io"
import { RangeControl } from "@/components/ride/ride-simulator-controls/components/range-control"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useUnitFormatters } from "@/hooks/use-unit-formatters"

type RideTrainerSimulatorPanelProps = {
  trainer: SimulatedTrainer
}

export function RideTrainerSimulatorPanel({
  trainer,
}: RideTrainerSimulatorPanelProps) {
  const [state, setState] = useState<SimulatedTrainerState>(trainer.simulator)
  const units = useUnitFormatters()

  useEffect(
    () => trainer.subscribeSimulatorState((next) => setState(next)),
    [trainer]
  )

  const fields: Array<[string, string]> = [
    ["ERG target", formatNullableWatts(state.targetPowerWatts)],
    ["Power", formatNullableWatts(state.currentPowerWatts)],
    ["Cadence", formatNullableRpm(state.currentCadenceRpm)],
    ["Speed", formatNullableSpeed(state.currentSpeedMps, units.speedMps)],
    ["Gradient", `${state.gradePercent.toFixed(1)}%`],
    [
      "Resistance",
      state.resistanceLevel == null ? "None" : `${state.resistanceLevel}`,
    ],
    ["Wind", `${state.windSpeedMps.toFixed(1)} m/s`],
    ["Capabilities", formatCapabilities(trainer.capabilities)],
  ]

  return (
    <div className="grid gap-4 border-t border-border/60 p-2 pt-4">
      <TrainerModeStatus connected={state.connected} mode={state.mode} />
      <TrainerStateGrid fields={fields} />
      <div className="grid gap-4 border-t border-border/60 pt-4">
        <ToggleGroup
          aria-label="Trainer mode"
          className="w-full"
          size="sm"
          variant="outline"
          value={[state.mode]}
          onValueChange={(value) => {
            const mode = value[0]
            if (isTrainerMode(mode)) {
              void trainer.sendCommand({ type: "setMode", mode })
            }
          }}
        >
          <ToggleGroupItem className="flex-1" value="free">
            Free
          </ToggleGroupItem>
          <ToggleGroupItem className="flex-1" value="erg">
            ERG
          </ToggleGroupItem>
          <ToggleGroupItem className="flex-1" value="simulation">
            Simulation
          </ToggleGroupItem>
          <ToggleGroupItem className="flex-1" value="resistance">
            Resistance
          </ToggleGroupItem>
        </ToggleGroup>
        <RangeControl
          label="Gradient"
          min={-15}
          max={15}
          step={0.5}
          unit="%"
          value={state.gradePercent}
          onChange={(gradePercent) => {
            void trainer.sendCommand({
              type: "setSimulationGrade",
              gradePercent,
              windSpeedMps: state.windSpeedMps,
            })
          }}
        />
        <RangeControl
          label="Resistance"
          min={0}
          max={100}
          step={1}
          unit=""
          value={state.resistanceLevel ?? 0}
          onChange={(level) => {
            void trainer.sendCommand({ type: "setResistance", level })
          }}
        />
        <RangeControl
          label="ERG target"
          min={0}
          max={700}
          step={5}
          unit="W"
          value={state.targetPowerWatts ?? 0}
          onChange={(watts) => {
            void trainer.sendCommand({ type: "setTargetPower", watts })
          }}
        />
      </div>
    </div>
  )
}

function isTrainerMode(
  value: string | undefined
): value is SimulatedTrainerMode {
  return (
    value === "free" ||
    value === "erg" ||
    value === "simulation" ||
    value === "resistance"
  )
}

function formatNullableWatts(value: number | null): string {
  return value == null ? "None" : `${Math.round(value)} W`
}

function formatNullableRpm(value: number | null): string {
  return value == null ? "None" : `${Math.round(value)} rpm`
}

function formatNullableSpeed(
  value: number | null,
  formatSpeed: (value: number) => string
): string {
  return value == null ? "None" : formatSpeed(value)
}

function formatCapabilities(capabilities: ReadonlySet<Capability>): string {
  const writable = [
    TrainerCapability.TargetPower,
    TrainerCapability.Resistance,
    TrainerCapability.SimulationGrade,
  ].filter((capability) => capabilities.has(capability)).length
  return `${capabilities.size} total, ${writable} controls`
}
