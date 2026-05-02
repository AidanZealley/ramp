import { TelemetryPanel } from "./components/telemetry-panel"
import { CommandPanel } from "./components/command-panel"
import type { RideSessionController } from "@ramp/ride-core"

export function DiagnosticsExperienceView({
  session,
}: {
  session: RideSessionController
}) {
  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto px-4 pt-16 pb-6 sm:px-8 sm:pt-20">
      <div className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/30 p-5 backdrop-blur-sm">
          <TelemetryPanel session={session} />
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-5 backdrop-blur-sm">
          <CommandPanel session={session} />
        </div>
      </div>
    </div>
  )
}
