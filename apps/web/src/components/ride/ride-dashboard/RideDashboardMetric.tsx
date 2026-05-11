import type { RideDashboardMetricProps } from "./types"
import { cn } from "@/lib/utils"

export const RideDashboardMetric = ({
  label,
  value,
  valueSuffix,
  tone = "default",
  className,
  valueClassName,
  valueSuffixClassName,
  testId,
}: RideDashboardMetricProps) => (
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
      {valueSuffix && (
        <span
          className={cn(
            "ml-1 align-baseline text-base font-semibold text-muted-foreground md:text-lg xl:text-xl",
            valueSuffixClassName
          )}
        >
          /{valueSuffix}
        </span>
      )}
    </div>
  </div>
)
