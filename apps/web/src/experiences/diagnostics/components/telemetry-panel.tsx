import { useRideHeartbeat, useRideSession } from "@ramp/ride-core"
import type { RideSessionController } from "@ramp/ride-core"

type TelemetryPanelProps = {
  session: RideSessionController
}

export function TelemetryPanel({ session }: TelemetryPanelProps) {
  useRideHeartbeat(session, 4)
  const state = useRideSession(session)
  const { telemetry } = state
  const capabilities = session.controls.getCapabilities()

  return (
    <div className="grid gap-4">
      <SectionLabel>Telemetry</SectionLabel>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TelemetryField label="Power" value={telemetry.powerWatts} unit="W" />
        <TelemetryField label="Cadence" value={telemetry.cadenceRpm} unit="rpm" />
        <TelemetryField
          label="Speed"
          value={telemetry.speedMps !== null ? +(telemetry.speedMps * 3.6).toFixed(1) : null}
          unit="km/h"
        />
        <TelemetryField label="Heart rate" value={telemetry.heartRateBpm} unit="bpm" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <TelemetryField
          label="Elapsed"
          value={formatSeconds(telemetry.elapsedSeconds)}
        />
        <TelemetryField
          label="Distance"
          value={`${(telemetry.distanceMeters / 1000).toFixed(2)} km`}
        />
        <TelemetryField
          label="Telemetry age"
          value={telemetry.telemetryAgeMs !== null ? `${telemetry.telemetryAgeMs} ms` : "--"}
        />
      </div>

      <SectionLabel>Status</SectionLabel>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatusField label="Trainer" value={telemetry.trainerStatus} />
        <StatusField label="Telemetry" value={telemetry.telemetryStatus} />
        <StatusField label="Source" value={telemetry.telemetrySource ?? "--"} />
        <StatusField label="Connected" value={state.trainerConnected ? "yes" : "no"} />
        <StatusField label="Control mode" value={state.activeControlMode} />
        <StatusField label="Paused" value={state.paused ? "yes" : "no"} />
      </div>

      {state.lastError && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {state.lastError}
        </div>
      )}

      <SectionLabel>Capabilities</SectionLabel>

      <div className="flex flex-wrap gap-1.5">
        {capabilities.size === 0 ? (
          <span className="text-sm text-white/40">None reported</span>
        ) : (
          Array.from(capabilities)
            .sort()
            .map((cap) => (
              <span
                key={cap}
                className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs font-medium text-white/70"
              >
                {cap}
              </span>
            ))
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[0.65rem] font-semibold tracking-[0.14em] text-white/50 uppercase">
      {children}
    </div>
  )
}

function TelemetryField({
  label,
  value,
  unit,
}: {
  label: string
  value: number | string | null
  unit?: string
}) {
  const display =
    value === null
      ? "--"
      : unit
        ? `${typeof value === "number" ? Math.round(value) : value} ${unit}`
        : String(value)

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[0.6rem] font-semibold tracking-[0.12em] text-white/40 uppercase">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-lg font-semibold text-white/90">
        {display}
      </div>
    </div>
  )
}

function StatusField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[0.6rem] font-semibold tracking-[0.12em] text-white/40 uppercase">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-white/70">{value}</div>
    </div>
  )
}

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
