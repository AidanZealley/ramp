import { useRideThrottledSelector } from "@ramp/ride-core/react"
import type React from "react"
import type { RideSessionController } from "@ramp/ride-core"

type StatusModuleProps = {
  session: RideSessionController
}

export const StatusModule = ({ session }: StatusModuleProps) => {
  const state = useRideThrottledSelector(
    session,
    (s) => ({
      trainerConnected: s.trainerConnected,
      activeControlMode: s.activeControlMode,
      paused: s.paused,
      lastError: s.lastError,
      telemetry: {
        trainerStatus: s.telemetry.trainerStatus,
        telemetryStatus: s.telemetry.telemetryStatus,
        telemetrySource: s.telemetry.telemetrySource,
        elapsedSeconds: Math.floor(s.telemetry.elapsedSeconds),
        distanceMeters: s.telemetry.distanceMeters,
        telemetryAgeMs: s.telemetry.telemetryAgeMs,
      },
    }),
    { hz: 4, equals: shallowEqualStatus }
  )
  const { telemetry } = state

  return (
    <section className="min-w-0" aria-label="Status">
      <ModuleLabel>Status</ModuleLabel>
      <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
        <StatusField label="Trainer status" value={telemetry.trainerStatus} />
        <StatusField
          label="Telemetry status"
          value={telemetry.telemetryStatus}
        />
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

function shallowEqualStatus(
  left: ReturnType<typeof selectComparableStatus>,
  right: ReturnType<typeof selectComparableStatus>
) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function selectComparableStatus(value: {
  trainerConnected: boolean
  activeControlMode: string
  paused: boolean
  lastError: string | null
  telemetry: {
    trainerStatus: string
    telemetryStatus: string
    telemetrySource: string | null
    elapsedSeconds: number
    distanceMeters: number
    telemetryAgeMs: number | null
  }
}) {
  return value
}
