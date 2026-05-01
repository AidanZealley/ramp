import { memo } from "react"
import type React from "react"
import { cn } from "@/lib/utils"

export const Stat = memo(function Stat({
  accent,
  icon,
  label,
  value,
}: {
  accent?: boolean
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-3xl border border-border/60 bg-background/60 px-4 py-3",
        accent && "border-primary/40 bg-primary/5"
      )}
    >
      <span className="text-foreground/70">{icon}</span>
      <div className="flex min-w-0 flex-col">
        <span className="text-[0.6rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {label}
        </span>
        <span className="font-heading text-xl leading-none font-semibold tabular-nums">
          {value}
        </span>
      </div>
    </div>
  )
})
