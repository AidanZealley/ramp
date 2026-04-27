import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  indicatorClassName?: string
}

export function Checkbox({
  className,
  indicatorClassName,
  checked = false,
  disabled,
  ...props
}: CheckboxProps) {
  return (
    <span
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center rounded-md border border-border bg-background text-primary transition-colors",
        checked && "border-primary bg-primary text-primary-foreground",
        disabled && "opacity-50",
        className
      )}
    >
      <input
        type="checkbox"
        className="absolute inset-0 cursor-pointer opacity-0"
        checked={checked}
        disabled={disabled}
        {...props}
      />
      <Check
        className={cn(
          "size-3 transition-opacity",
          checked ? "opacity-100" : "opacity-0",
          indicatorClassName
        )}
      />
    </span>
  )
}
