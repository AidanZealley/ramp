import { useRideSelector, useRideThrottledSelector } from "@ramp/ride-react"
import { CapabilitiesModule } from "./components/capabilities-module"
import { CommandsModule } from "./components/commands-module"
import { StatusModule } from "./components/status-module"
import type { RideSessionController } from "@ramp/ride-core"
import {
  RideDashboardMetric,
  RideHeartCadenceModule,
  RidePowerModule,
  formatSpeedKph,
} from "@/components/ride/ride-dashboard"

export function DiagnosticsExperienceView({
  session,
}: {
  session: RideSessionController
}) {
  const telemetry = useRideThrottledSelector(session, (s) => s.telemetry, {
    hz: 2,
  })
  const trainerConnected = useRideSelector(session, (s) => s.trainerConnected)
  const showStaleBadge =
    telemetry.telemetryStatus === "stale" && trainerConnected

  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto px-4 pt-16 pb-6 sm:px-8 sm:pt-20">
      <div className="relative flex min-h-full w-full flex-1 flex-col gap-5 px-0 py-2 sm:gap-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[0.65rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                Diagnostics
              </span>
              {showStaleBadge && (
                <span className="rounded-full border border-border px-2 py-0.5 text-[0.6rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Stale
                </span>
              )}
            </div>
            <h2 className="font-heading mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl">
              Trainer telemetry
            </h2>
          </div>
        </div>

        <div className="grid flex-1 content-center gap-7 md:grid-cols-3 md:gap-8 xl:gap-10">
          <RidePowerModule
            powerWatts={telemetry.powerWatts}
            telemetrySource={telemetry.telemetrySource}
            telemetryStatus={telemetry.telemetryStatus}
            showTarget={false}
          />
          <RideDashboardMetric
            label="Speed"
            value={formatSpeedKph(telemetry.speedMps)}
            tone={telemetry.speedMps === null ? "muted" : "default"}
            valueClassName="text-6xl md:text-7xl xl:text-8xl"
          />
          <RideHeartCadenceModule
            heartRateBpm={telemetry.heartRateBpm}
            cadenceRpm={telemetry.cadenceRpm}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 xl:gap-10">
          <StatusModule session={session} />
          <CapabilitiesModule session={session} />
          <CommandsModule session={session} />
        </div>
      </div>
    </div>
  )
}
