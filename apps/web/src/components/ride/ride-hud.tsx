import { useRideSession, useRideSessionContext } from "@ramp/ride-core"
import { formatDuration } from "@/lib/workout-utils"

export function RideHud() {
  const session = useRideSessionContext()
  const { telemetry } = useRideSession(session)
  const primaryFields = [
    ["Watts", `${Math.round(telemetry.powerWatts ?? 0)} W`],
    ["Cadence", `${Math.round(telemetry.cadenceRpm ?? 0)} rpm`],
    ["Speed", `${((telemetry.speedMps ?? 0) * 3.6).toFixed(1)} km/h`],
  ]
  const secondaryFields = [
    ["Time", formatDuration(telemetry.elapsedSeconds)],
    ["Distance", `${(telemetry.distanceMeters / 1000).toFixed(2)} km`],
    ["Source", "Simulator"],
  ]

  return (
    <div className="grid gap-3 p-2">
      <div className="grid gap-2 sm:grid-cols-3">
        {primaryFields.map(([label, value]) => (
          <div key={label} className="min-w-0 px-1 py-1">
            <div className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {label}
            </div>
            <div className="mt-1 font-heading text-2xl leading-none font-semibold text-foreground">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border/60 pt-3">
        <div className="px-1 pb-3">
          <div className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Ride status
          </div>
          <div className="mt-1 truncate font-heading text-lg font-semibold text-foreground">
            {telemetry.trainerStatus === "ready" ? "Connected" : "Free ride"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
          {secondaryFields.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <div className="text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                {label}
              </div>
              <div className="truncate font-heading text-base font-semibold text-foreground">
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
