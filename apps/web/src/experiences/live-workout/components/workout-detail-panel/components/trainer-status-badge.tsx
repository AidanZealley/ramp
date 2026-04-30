import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  PowerOff,
} from "lucide-react"
import type { RideTelemetry } from "@ramp/ride-core"
import { cn } from "@/lib/utils"

type TrainerStatus = RideTelemetry["trainerStatus"]

const STATUS_COPY: Record<
  TrainerStatus,
  { label: string; tone: "ready" | "pending" | "error" }
> = {
  ready: { label: "Trainer connected", tone: "ready" },
  connecting: { label: "Connecting trainer...", tone: "pending" },
  disconnected: { label: "Trainer disconnected", tone: "pending" },
  error: { label: "Trainer error", tone: "error" },
}

export function TrainerStatusBadge({ status }: { status: TrainerStatus }) {
  const { label, tone } = STATUS_COPY[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.12em] uppercase",
        tone === "ready" && "bg-emerald-500/15 text-emerald-700",
        tone === "pending" && "bg-amber-400/20 text-amber-800",
        tone === "error" && "bg-destructive/15 text-destructive"
      )}
    >
      <StatusIcon status={status} />
      {label}
    </span>
  )
}

function StatusIcon({ status }: { status: TrainerStatus }) {
  if (status === "ready") return <CheckCircle2 className="size-4" />
  if (status === "connecting") return <Loader2 className="size-4 animate-spin" />
  if (status === "error") return <AlertCircle className="size-4" />
  return <PowerOff className="size-4" />
}
