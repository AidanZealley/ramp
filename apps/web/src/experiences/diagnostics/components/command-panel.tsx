import { useState } from "react"
import {
  Capability,
  TRAINER_COMMAND_LIMITS,
  useRideSelector,
} from "@ramp/ride-core"
import type { RideSessionController, TrainerCommand } from "@ramp/ride-core"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

type CommandPanelProps = {
  session: RideSessionController
}

type Mode = "erg" | "resistance" | "simulation" | "free"

const MODES: Array<{ value: Mode; label: string }> = [
  { value: "erg", label: "ERG" },
  { value: "resistance", label: "Resistance" },
  { value: "simulation", label: "Simulation" },
  { value: "free", label: "Free" },
]

export function CommandPanel({ session }: CommandPanelProps) {
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
    <div className="grid gap-4">
      <div className="text-[0.65rem] font-semibold tracking-[0.14em] text-white/50 uppercase">
        Commands
      </div>

      {/* Mode selector */}
      <div>
        <div className="mb-2 text-xs font-medium text-white/60">
          Mode ({activeControlMode})
        </div>
        <div className="flex gap-1.5">
          {MODES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              disabled={!trainerConnected}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === value
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
              } disabled:opacity-30`}
              onClick={() => handleModeChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Power target (ERG) */}
      {mode === "erg" && (
        <CommandSlider
          label="Target power"
          unit="W"
          min={TRAINER_COMMAND_LIMITS.targetPowerWatts.min}
          max={600}
          step={5}
          value={powerWatts}
          disabled={!trainerConnected || !canTargetPower}
          disabledReason={!canTargetPower ? "Capability not available" : undefined}
          onChange={(watts) => {
            setPowerWatts(watts)
            void dispatch({ type: "setTargetPower", watts })
          }}
        />
      )}

      {/* Resistance level */}
      {mode === "resistance" && (
        <CommandSlider
          label="Resistance level"
          unit="%"
          min={TRAINER_COMMAND_LIMITS.resistanceLevel.min}
          max={TRAINER_COMMAND_LIMITS.resistanceLevel.max}
          step={1}
          value={resistanceLevel}
          disabled={!trainerConnected || !canResistance}
          disabledReason={!canResistance ? "Capability not available" : undefined}
          onChange={(level) => {
            setResistanceLevel(level)
            void dispatch({ type: "setResistance", level })
          }}
        />
      )}

      {/* Simulation grade */}
      {mode === "simulation" && (
        <CommandSlider
          label="Grade"
          unit="%"
          min={TRAINER_COMMAND_LIMITS.simulationGradePercent.min}
          max={TRAINER_COMMAND_LIMITS.simulationGradePercent.max}
          step={0.5}
          value={gradePercent}
          disabled={!trainerConnected || !canSimulation}
          disabledReason={!canSimulation ? "Capability not available" : undefined}
          onChange={(grade) => {
            setGradePercent(grade)
            void dispatch({ type: "setSimulationGrade", gradePercent: grade })
          }}
        />
      )}

      {/* Last dispatch result */}
      {lastResult && (
        <div className="text-xs text-white/40">
          Last dispatch: <span className="font-mono text-white/60">{lastResult}</span>
        </div>
      )}
    </div>
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
    <div className={`grid gap-2 ${disabled ? "opacity-40" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-[0.7rem] font-semibold tracking-[0.12em] text-white/60 uppercase">
          {label}
        </Label>
        <span className="font-mono text-sm font-semibold text-white/80">
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
        <div className="text-[0.6rem] text-white/30">{disabledReason}</div>
      )}
    </div>
  )
}
