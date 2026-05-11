import { useRideHeartbeat, useRideSession } from "@ramp/ride-core"
import type React from "react"
import type { RideSessionController } from "@ramp/ride-core"

type StatusModuleProps = {
  session: RideSessionController
}

export const StatusModule = ({ session }: StatusModuleProps) => {
  useRideHeartbeat(session, 4)
  const state = useRideSession(session)
  const { telemetry } = state

  return (
    <section className="min-w-0" aria-label="Status">
      <ModuleLabel>Status</ModuleLabel>
      <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
        <StatusField label="Trainer status" value={telemetry.trainerStatus} />
        <StatusField label="Telemetry status" value={telemetry.telemetryStatus} />
        <StatusField label="Source" value={telemetry.telemetrySource ?? "--"} />
        <StatusField
          label="Connected"
          value={state.trainerConnected ? "yes" : "no"}
        />
        <StatusField label="Control mode" value={state.activeControlMode} />
        <StatusField label="Paused" value={state.paused ? "yes" : "no"} />
        <StatusField
          label="Elapsed"
          value={formatSeconds(telemetry.elapsedSeconds)}
        />
        <StatusField
          label="Distance"
          value={`${(telemetry.distanceMeters / 1000).toFixed(2)} km`}
        />
        <StatusField
          label="Telemetry age"
          value={
            telemetry.telemetryAgeMs !== null
              ? `${telemetry.telemetryAgeMs} ms`
              : "--"
          }
        />
      </div>
      {state.lastError && (
        <div className="mt-4 border-l-2 border-destructive pl-3 text-sm font-medium text-destructive">
          {state.lastError}
        </div>
      )}
    </section>
  )
}

const ModuleLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
    {children}
  </div>
)

const StatusField = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0 border-l border-border pl-3">
    <div className="text-[0.6rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
      {label}
    </div>
    <div className="mt-0.5 truncate text-sm font-semibold text-foreground">
      {value}
    </div>
  </div>
)

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
