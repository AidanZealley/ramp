import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import type { ElevationSample } from "@/lib/routes/types"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  metersToDisplayDistance,
  metersToDisplayElevation,
  type UnitSystem,
} from "@/lib/units"

type ElevationChartProps = {
  samples: Array<ElevationSample>
  unitSystem: UnitSystem
}

const chartConfig = {
  displayElevation: {
    label: "Elevation",
    color: "var(--primary)",
  },
}

export const ElevationChart = ({ samples, unitSystem }: ElevationChartProps) => {
  if (samples.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/70 text-sm text-muted-foreground">
        No elevation data available.
      </div>
    )
  }

  const data = samples.map((sample) => ({
    displayDistance: Number(
      metersToDisplayDistance(sample.distanceMeters, unitSystem).value.toFixed(2)
    ),
    displayElevation: Math.round(
      metersToDisplayElevation(sample.elevationMeters, unitSystem).value
    ),
  }))
  const distanceUnit = unitSystem === "imperial" ? "mi" : "km"
  const elevationUnit = unitSystem === "imperial" ? "ft" : "m"

  return (
    <ChartContainer
      config={chartConfig}
      className="h-64 w-full rounded-lg border border-border/70 bg-card p-3"
      initialDimension={{ width: 640, height: 256 }}
    >
      <AreaChart data={data} margin={{ left: 8, right: 8, top: 12, bottom: 0 }}>
        <defs>
          <linearGradient id="routeElevation" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-displayElevation)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-displayElevation)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="displayDistance"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => `${value} ${distanceUnit}`}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={48}
          tickFormatter={(value) => `${value} ${elevationUnit}`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => `${label} ${distanceUnit}`}
              formatter={(value) => `${value} ${elevationUnit}`}
            />
          }
        />
        <Area
          dataKey="displayElevation"
          type="monotone"
          fill="url(#routeElevation)"
          stroke="var(--color-displayElevation)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
