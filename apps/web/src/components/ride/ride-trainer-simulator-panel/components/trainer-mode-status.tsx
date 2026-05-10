import type { SimulatedTrainerMode } from "@ramp/trainer-io"

type TrainerModeStatusProps = {
  mode: SimulatedTrainerMode
  connected: boolean
}

const MODE_LABELS: Record<SimulatedTrainerMode, string> = {
  free: "Free",
  erg: "ERG",
  simulation: "Simulation",
  resistance: "Resistance",
}

export function TrainerModeStatus({ connected, mode }: TrainerModeStatusProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Trainer mode
        </div>
        <div className="font-heading text-lg font-semibold">
          {MODE_LABELS[mode]}
        </div>
      </div>
      <span className="rounded-full border border-border/70 px-2 py-1 text-xs font-medium">
        {connected ? "Connected" : "Disconnected"}
      </span>
    </div>
  )
}
