import type { DurationFilter } from "./types"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface DrawerFilterChipsProps {
  value: DurationFilter
  onChange: (value: DurationFilter) => void
}

const durationFilterOptions: Array<[DurationFilter, string]> = [
  ["any", "Any"],
  ["short", "< 30 min"],
  ["medium", "30-60 min"],
  ["long", "> 60 min"],
]

export function DrawerFilterChips({ value, onChange }: DrawerFilterChipsProps) {
  return (
    <ToggleGroup
      variant="outline"
      className="flex-wrap"
      value={[value]}
      onValueChange={(values) => {
        const nextValue = values[0] as DurationFilter | undefined
        if (nextValue) onChange(nextValue)
      }}
    >
      {durationFilterOptions.map(([optionValue, label]) => (
        <ToggleGroupItem key={optionValue} value={optionValue}>
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
