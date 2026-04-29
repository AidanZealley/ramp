import { formatDuration } from "@/lib/workout-utils"
import { useRideSession, useRideSessionContext } from "@ramp/ride-core"
import type { WorkoutSessionController } from "@ramp/ride-workouts"

type RideHudProps = {
  workoutState: ReturnType<WorkoutSessionController["getState"]>
}

export function RideHud({ workoutState }: RideHudProps) {
  const session = useRideSessionContext()
  const { telemetry } = useRideSession(session)
  const fields = [
    ["Time", formatDuration(telemetry.elapsedSeconds)],
    ["Distance", `${(telemetry.distanceMeters / 1000).toFixed(2)} km`],
    ["Speed", `${((telemetry.speedMps ?? 0) * 3.6).toFixed(1)} km/h`],
    ["Watts", `${Math.round(telemetry.powerWatts ?? 0)} W`],
    ["Cadence", `${Math.round(telemetry.cadenceRpm ?? 0)} rpm`],
    ["Target", `${workoutState.targetWatts ?? telemetry.powerWatts ?? 0} W`],
    ["Segment", workoutState.activeSegmentLabel ?? "Free ride"],
    ["Source", "Simulator"],
  ]

  return (
    <div className="pointer-events-auto grid w-[min(720px,calc(100vw-2rem))] grid-cols-2 gap-2 rounded-lg border border-white/35 bg-white/72 p-3 shadow-2xl shadow-emerald-950/20 backdrop-blur-md sm:grid-cols-4">
      {fields.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <div className="text-[0.65rem] font-semibold tracking-[0.12em] text-[#47564e] uppercase">
            {label}
          </div>
          <div className="truncate font-heading text-lg font-semibold text-[#14201b]">
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}
