import { AlertCircle } from "lucide-react"

export function TelemetryStaleBadge() {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
      <AlertCircle className="size-3.5" />
      <span>Signal weak</span>
    </div>
  )
}
