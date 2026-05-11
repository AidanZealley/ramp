import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

type CockpitRangeControlProps = {
  label: string
  min: number
  max: number
  step: number
  unit: string
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  formatValue?: (value: number) => string
}

export function CockpitRangeControl({
  label,
  min,
  max,
  step,
  unit,
  value,
  onChange,
  disabled,
  formatValue,
}: CockpitRangeControlProps) {
  const id = `ride-cockpit-${label.toLowerCase().replaceAll(" ", "-")}`
  const displayValue = formatValue
    ? formatValue(value)
    : `${Math.round(value)}${unit ? ` ${unit}` : ""}`

  return (
    <div className="grid min-w-0 gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label
          className="truncate text-[0.66rem] leading-none font-semibold tracking-widest uppercase"
          htmlFor={id}
        >
          {label}
        </Label>
        <span className="shrink-0 font-heading text-xs font-semibold tabular-nums">
          {displayValue}
        </span>
      </div>
      <Slider
        id={id}
        aria-label={label}
        className="py-1"
        max={max}
        min={min}
        step={step}
        value={[value]}
        disabled={disabled}
        onValueChange={(nextValue) => {
          const values = Array.isArray(nextValue) ? nextValue : [nextValue]
          onChange(values[0] ?? value)
        }}
      />
    </div>
  )
}
