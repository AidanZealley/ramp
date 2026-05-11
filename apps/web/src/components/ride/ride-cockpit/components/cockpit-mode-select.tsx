import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type CockpitModeSelectOption<TValue extends string> = {
  label: string
  value: TValue
}

type CockpitModeSelectProps<TValue extends string> = {
  ariaLabel: string
  value: TValue
  options: Array<CockpitModeSelectOption<TValue>>
  onChange: (value: TValue) => void
}

export function CockpitModeSelect<TValue extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: CockpitModeSelectProps<TValue>) {
  const selected = options.find((option) => option.value === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={ariaLabel}
            className="h-8 min-w-28 justify-between gap-2 px-2.5 text-xs"
            size="sm"
            type="button"
            variant="secondary"
          />
        }
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <ChevronDown className="size-3.5 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
