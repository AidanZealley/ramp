import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

interface ToggleGroupProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: Array<{
    value: T
    label: string
  }>
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
}

export function ToggleGroup<T extends string>({
  value,
  onValueChange,
  options,
  size = "sm",
  className,
}: ToggleGroupProps<T>) {
  return (
    <ButtonGroup className={cn(className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={value === option.value ? "default" : "outline"}
          size={size}
          onClick={() => onValueChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </ButtonGroup>
  )
}
