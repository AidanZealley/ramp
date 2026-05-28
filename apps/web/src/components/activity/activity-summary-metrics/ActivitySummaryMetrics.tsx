import type { ActivityMetric } from "./types"

type ActivitySummaryMetricsProps = {
  metrics: Array<ActivityMetric>
}

export const ActivitySummaryMetrics = ({
  metrics,
}: ActivitySummaryMetricsProps) => {
  if (metrics.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-lg border bg-background p-3">
          <div className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            {metric.label}
          </div>
          <div className="mt-1 truncate font-heading text-xl font-semibold tabular-nums">
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  )
}
