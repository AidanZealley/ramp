import { Bar, BarChart, LabelList, Rectangle, XAxis } from "recharts"
import type {ChartConfig} from "@/components/ui/chart";
import {  ChartContainer } from "@/components/ui/chart"
import { getZoneInfoByZone } from "@/lib/zones"

interface WorkoutZoneChartProps {
  zonePercentages: Record<1 | 2 | 3 | 4 | 5 | 6, number>
  className?: string
}

const chartConfig = {
  percentage: {
    label: "Zone time",
  },
  zone1: {
    label: getZoneInfoByZone(1).name,
    color: getZoneInfoByZone(1).color,
  },
  zone2: {
    label: getZoneInfoByZone(2).name,
    color: getZoneInfoByZone(2).color,
  },
  zone3: {
    label: getZoneInfoByZone(3).name,
    color: getZoneInfoByZone(3).color,
  },
  zone4: {
    label: getZoneInfoByZone(4).name,
    color: getZoneInfoByZone(4).color,
  },
  zone5: {
    label: getZoneInfoByZone(5).name,
    color: getZoneInfoByZone(5).color,
  },
  zone6: {
    label: getZoneInfoByZone(6).name,
    color: getZoneInfoByZone(6).color,
  },
} satisfies ChartConfig

export function WorkoutZoneChart({
  zonePercentages,
  className = "h-44 w-full [&_.recharts-label-list_text]:text-xs [&_.recharts-label-list_text]:font-medium",
}: WorkoutZoneChartProps) {
  const chartData = ([1, 2, 3, 4, 5, 6] as const).map((zone) => {
    const zoneInfo = getZoneInfoByZone(zone)

    return {
      zoneKey: `zone${zone}`,
      zoneLabel: `Z${zone}`,
      percentage: Number(zonePercentages[zone].toFixed(1)),
      fill: zoneInfo.color,
    }
  })

  return (
    <ChartContainer config={chartConfig} className={className}>
      <BarChart
        accessibilityLayer
        data={chartData}
        margin={{ top: 18, right: 8, left: 8, bottom: 12 }}
      >
        <XAxis
          axisLine={false}
          dataKey="zoneLabel"
          tickLine={false}
          tickMargin={8}
        />
        <Bar
          dataKey="percentage"
          maxBarSize={40}
          shape={(props) => (
            <Rectangle {...props} fill={props.payload?.fill} radius={4} />
          )}
        >
          <LabelList
            dataKey="percentage"
            position="top"
            formatter={(value) =>
              typeof value === "number" ? `${Math.round(value)}%` : value
            }
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
