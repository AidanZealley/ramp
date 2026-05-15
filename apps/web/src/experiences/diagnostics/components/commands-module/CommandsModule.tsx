import { useState } from "react"
import {
  Capability,
  TRAINER_COMMAND_LIMITS,
} from "@ramp/ride-core"
import { useRideSelector } from "@ramp/ride-react"
import type { RideSessionController, TrainerCommand } from "@ramp/ride-core"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

type CommandsModuleProps = {
  session: RideSessionController
}

type Mode = "erg" | "resistance" | "simulation" | "free"

const MODES: Array<{ value: Mode; label: string }> = [
  { value: "erg", label: "ERG" },
  { value: "resistance", label: "Resistance" },
  { value: "simulation", label: "Simulation" },
  { value: "free", label: "Free" },
]

export const CommandsModule = ({ session }: CommandsModuleProps) => {
  const activeControlMode = useRideSelector(
    session,
    (s) => s.activeControlMode
  )
  const trainerConnected = useRideSelector(session, (s) => s.trainerConnected)
  const capabilities = session.controls.getCapabilities()

  const [mode, setMode] = useState<Mode>("free")
  const [powerWatts, setPowerWatts] = useState(150)
  const [resistanceLevel, setResistanceLevel] = useState(50)
  const [gradePercent, setGradePercent] = useState(0)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const dispatch = async (command: TrainerCommand) => {
    const result = await session.controls.dispatch(command, "user")
    setLastResult(result.ok ? "ok" : `rejected: ${result.reason}`)
  }

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode)
    void dispatch({ type: "setMode", mode: nextMode })
  }

  const canTargetPower = capabilities.has(Capability.TargetPower)
  const canResistance = capabilities.has(Capability.Resistance)
  const canSimulation = capabilities.has(Capability.SimulationGrade)

  return (
    <section className="min-w-0" aria-label="Commands">
      <div className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        Commands
      </div>

      <div className="mt-3">
        <div className="mb-2 text-xs font-semibold text-muted-foreground">
          Mode ({activeControlMode})
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MODES.map(({ value, label }) => (
            <Button
              key={value}
              type="button"
              variant={mode === value ? "secondary" : "outline"}
              size="sm"
              disabled={!trainerConnected}
              className="h-8 rounded-md px-3 text-xs font-semibold"
              onClick={() => handleModeChange(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        {mode === "erg" && (
          <CommandSlider
            label="Target power"
            unit="W"
            min={TRAINER_COMMAND_LIMITS.targetPowerWatts.min}
            max={600}
            step={5}
            value={powerWatts}
            disabled={!trainerConnected || !canTargetPower}
            disabledReason={
              !canTargetPower ? "Capability not available" : undefined
            }
            onChange={(watts) => {
              setPowerWatts(watts)
              void dispatch({ type: "setTargetPower", watts })
            }}
          />
        )}

        {mode === "resistance" && (
          <CommandSlider
            label="Resistance level"
            unit="%"
            min={TRAINER_COMMAND_LIMITS.resistanceLevel.min}
            max={TRAINER_COMMAND_LIMITS.resistanceLevel.max}
            step={1}
            value={resistanceLevel}
            disabled={!trainerConnected || !canResistance}
            disabledReason={
              !canResistance ? "Capability not available" : undefined
            }
            onChange={(level) => {
              setResistanceLevel(level)
              void dispatch({ type: "setResistance", level })
            }}
          />
        )}

        {mode === "simulation" && (
          <CommandSlider
            label="Grade"
            unit="%"
            min={TRAINER_COMMAND_LIMITS.simulationGradePercent.min}
            max={TRAINER_COMMAND_LIMITS.simulationGradePercent.max}
            step={0.5}
            value={gradePercent}
            disabled={!trainerConnected || !canSimulation}
            disabledReason={
              !canSimulation ? "Capability not available" : undefined
            }
            onChange={(grade) => {
              setGradePercent(grade)
              void dispatch({ type: "setSimulationGrade", gradePercent: grade })
            }}
          />
        )}
      </div>

      {lastResult && (
        <div className="mt-4 text-xs text-muted-foreground">
          Last dispatch:{" "}
          <span className="font-mono font-semibold text-foreground">
            {lastResult}
          </span>
        </div>
      )}
    </section>
  )
}

function CommandSlider({
  label,
  unit,
  min,
  max,
  step,
  value,
  disabled,
  disabledReason,
  onChange,
}: {
  label: string
  unit: string
  min: number
  max: number
  step: number
  value: number
  disabled: boolean
  disabledReason?: string
  onChange: (value: number) => void
}) {
  return (
    <div className={cn("grid gap-2", disabled && "opacity-50")}>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-[0.7rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </Label>
        <span className="font-mono text-sm font-semibold text-foreground">
          {value} {unit}
        </span>
      </div>
      <Slider
        aria-label={label}
        className="py-2"
        disabled={disabled}
        max={max}
        min={min}
        step={step}
        value={[value]}
        onValueChange={(nextValue) => {
          const values = Array.isArray(nextValue) ? nextValue : [nextValue]
          onChange(values[0] ?? value)
        }}
      />
      {disabled && disabledReason && (
        <div className="text-[0.65rem] font-medium text-muted-foreground">
          {disabledReason}
        </div>
      )}
    </div>
  )
}
