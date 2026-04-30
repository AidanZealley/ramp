import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

type RangeControlProps = {
  label: string
  max: number
  min: number
  onChange: (value: number) => void
  step: number
  unit: string
  value: number
}

export function RangeControl({
  label,
  max,
  min,
  onChange,
  step,
  unit,
  value,
}: RangeControlProps) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label
          className="text-[0.7rem] font-semibold tracking-[0.12em] uppercase"
          htmlFor={`ride-${label.toLowerCase()}`}
        >
          {label}
        </Label>
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
