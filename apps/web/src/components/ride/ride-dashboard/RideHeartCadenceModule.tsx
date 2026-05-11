import { RideDashboardMetric } from "./RideDashboardMetric"
import type { RideHeartCadenceModuleProps } from "./types"

export const RideHeartCadenceModule = ({
  heartRateBpm,
  cadenceRpm,
}: RideHeartCadenceModuleProps) => (
  <div className="flex min-w-0 flex-col gap-5">
    <div className="min-w-0">
      <div className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        Heart rate
      </div>
      <div
        className={
          heartRateBpm !== null
            ? "font-heading mt-2 truncate text-6xl leading-none font-semibold tabular-nums md:text-7xl xl:text-8xl"
            : "mt-2 truncate text-base font-medium text-muted-foreground md:text-lg"
        }
      >
        {heartRateBpm !== null
          ? `${Math.round(heartRateBpm)} bpm`
          : "Not connected"}
      </div>
    </div>
    <RideDashboardMetric
      label="Cadence"
      value={cadenceRpm !== null ? `${Math.round(cadenceRpm)} rpm` : "-- rpm"}
      tone={cadenceRpm === null ? "muted" : "default"}
      valueClassName="text-4xl md:text-5xl xl:text-6xl"
    />
  </div>
)
