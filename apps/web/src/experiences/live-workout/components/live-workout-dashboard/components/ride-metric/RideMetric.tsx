import { cn } from "@/lib/utils"

type RideMetricProps = {
  label: string
  value: string
  tone?: "default" | "danger" | "muted"
  className?: string
  valueClassName?: string
  testId?: string
}

export const RideMetric = ({
  label,
  value,
  tone = "default",
  className,
  valueClassName,
  testId,
}: RideMetricProps) => (
  <div className={cn("min-w-0", className)}>
    <div className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
      {label}
    </div>
    <div
      data-testid={testId}
      className={cn(
        "font-heading mt-1 truncate text-4xl leading-none font-semibold tabular-nums md:text-5xl xl:text-6xl",
        tone === "danger" && "text-destructive",
        tone === "muted" && "text-muted-foreground",
        valueClassName
      )}
    >
      {value}
    </div>
  </div>
)
