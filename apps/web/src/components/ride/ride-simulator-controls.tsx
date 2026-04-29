import { Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import type { WorkoutDefinition } from "@ramp/ride-workouts"

export type RideInputMode = "manual" | "followWorkout"

type Preset = "endurance" | "tempo" | "vo2" | "workout"

type RideSimulatorControlsProps = {
  powerWatts: number
  cadenceRpm: number
  mode: RideInputMode
  paused: boolean
  workouts: Array<WorkoutDefinition>
  selectedWorkoutId: string
  onPowerChange(powerWatts: number): void
  onCadenceChange(cadenceRpm: number): void
  onModeChange(mode: RideInputMode): void
  onPreset(preset: Preset): void
  onPauseToggle(): void
  onWorkoutChange(workoutId: string): void
}

export function RideSimulatorControls({
  cadenceRpm,
  mode,
  onCadenceChange,
  onModeChange,
  onPauseToggle,
  onPowerChange,
  onPreset,
  onWorkoutChange,
  paused,
  powerWatts,
  selectedWorkoutId,
  workouts,
}: RideSimulatorControlsProps) {
  return (
    <div className="pointer-events-auto w-[min(360px,calc(100vw-2rem))] rounded-lg border border-white/35 bg-[#f8fbf4]/78 p-3 shadow-2xl shadow-emerald-950/20 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-heading text-sm font-semibold">
            {mode === "followWorkout" ? "Follow Workout" : "Simulator"}
          </div>
          <div className="text-xs text-[#506157]">
            {Math.round(powerWatts)} W · {Math.round(cadenceRpm)} rpm
          </div>
        </div>
        <Button
          aria-label={paused ? "Resume ride" : "Pause ride"}
          size="icon"
          type="button"
          onClick={onPauseToggle}
        >
          {paused ? <Play /> : <Pause />}
        </Button>
      </div>

      <div className="mt-4 space-y-3">
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

      <div className="mt-4 grid grid-cols-2 gap-2">
        <PresetButton onClick={() => onPreset("endurance")}>
          Endurance
        </PresetButton>
        <PresetButton onClick={() => onPreset("tempo")}>Tempo</PresetButton>
        <PresetButton onClick={() => onPreset("vo2")}>VO2</PresetButton>
        <PresetButton onClick={() => onPreset("workout")}>
          Follow Workout
        </PresetButton>
      </div>

      <div className="mt-4 grid gap-2">
        <Label htmlFor="ride-workout-select">Workout</Label>
        <select
          id="ride-workout-select"
          className="h-9 rounded-md border border-[#d7dfd2] bg-white/80 px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-emerald-900/20"
          value={selectedWorkoutId}
          onChange={(event) => onWorkoutChange(event.currentTarget.value)}
        >
          {workouts.length === 0 ? (
            <option value="">Free ride</option>
          ) : (
            workouts.map((workout) => (
              <option key={workout.id} value={workout.id}>
                {workout.title}
              </option>
            ))
          )}
        </select>
        <div className="flex gap-2">
          <Button
            className="flex-1 rounded-md"
            type="button"
            variant={mode === "manual" ? "default" : "secondary"}
            onClick={() => onModeChange("manual")}
          >
            Manual
          </Button>
          <Button
            className="flex-1 rounded-md"
            type="button"
            variant={mode === "followWorkout" ? "default" : "secondary"}
            onClick={() => onModeChange("followWorkout")}
          >
            Workout
          </Button>
        </div>
      </div>
    </div>
  )
}

function RangeControl({
  label,
  max,
  min,
  onChange,
  step,
  unit,
  value,
}: {
  label: string
  max: number
  min: number
  onChange(value: number): void
  step: number
  unit: string
  value: number
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`ride-${label.toLowerCase()}`}>{label}</Label>
        <span className="font-heading text-sm font-semibold">
          {Math.round(value)} {unit}
        </span>
      </div>
      <Slider
        id={`ride-${label.toLowerCase()}`}
        aria-label={label}
        className="py-2"
        max={max}
        min={min}
        step={step}
        value={[value]}
        onValueChange={(nextValue) => {
          const values = Array.isArray(nextValue) ? nextValue : [nextValue]
          onChange(values[0] ?? value)
        }}
      />
    </div>
  )
}

function PresetButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick(): void
}) {
  return (
    <Button
      className="rounded-md"
      type="button"
      variant="secondary"
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
