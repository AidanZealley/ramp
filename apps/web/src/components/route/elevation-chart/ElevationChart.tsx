import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { metersToFeet, metersToMiles } from "@/lib/routes/format"
import type { ElevationSample } from "@/lib/routes/types"

type ElevationChartProps = {
  samples: Array<ElevationSample>
}

const chartConfig = {
  elevationFeet: {
    label: "Elevation",
    color: "var(--primary)",
  },
}

export const ElevationChart = ({ samples }: ElevationChartProps) => {
  if (samples.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/70 text-sm text-muted-foreground">
        No elevation data available.
      </div>
    )
  }

  const data = samples.map((sample) => ({
    distanceMiles: Number(metersToMiles(sample.distanceMeters).toFixed(2)),
    elevationFeet: Math.round(metersToFeet(sample.elevationMeters)),
  }))

  return (
    <ChartContainer
      config={chartConfig}
      className="h-64 w-full rounded-lg border border-border/70 bg-card p-3"
      initialDimension={{ width: 640, height: 256 }}
    >
      <AreaChart data={data} margin={{ left: 8, right: 8, top: 12, bottom: 0 }}>
        <defs>
          <linearGradient id="routeElevation" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-elevationFeet)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-elevationFeet)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="distanceMiles"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => `${value} mi`}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={48}
          tickFormatter={(value) => `${value} ft`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => `${label} mi`}
              formatter={(value) => `${value} ft`}
            />
          }
        />
        <Area
          dataKey="elevationFeet"
          type="monotone"
          fill="url(#routeElevation)"
          stroke="var(--color-elevationFeet)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
