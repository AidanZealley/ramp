import { cn } from "@/lib/utils"
import type { RidePowerModuleProps } from "./types"
import { getSourceLabel } from "./utils"

export const RidePowerModule = ({
  targetWatts = null,
  powerWatts,
  telemetrySource,
  telemetryStatus,
  showTarget = true,
}: RidePowerModuleProps) => {
  const riderUnavailable = powerWatts === null

  return (
    <section aria-label="Power" className="min-w-0">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="min-w-0">
          <div className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Rider
          </div>
          <div
            data-testid="rider-power"
            className={cn(
              "mt-2 truncate font-heading text-6xl leading-none font-semibold tabular-nums md:text-7xl xl:text-8xl",
              riderUnavailable && "text-muted-foreground"
            )}
          >
            {powerWatts !== null ? `${Math.round(powerWatts)}W` : "--W"}
          </div>
        </div>
        {showTarget && (
          <div className="min-w-0">
            <div className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Target
            </div>
            <div
              data-testid="target-power"
              className={cn(
                "mt-1 truncate font-heading text-4xl leading-none font-semibold tabular-nums md:text-5xl xl:text-6xl",
                targetWatts === null && "text-muted-foreground"
              )}
            >
              {targetWatts !== null ? `${targetWatts}W` : "--"}
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 text-xs font-medium text-muted-foreground">
        {getSourceLabel(telemetrySource)}
        {telemetryStatus === "stale" ? " · stale" : ""}
      </div>
    </section>
  )
}
