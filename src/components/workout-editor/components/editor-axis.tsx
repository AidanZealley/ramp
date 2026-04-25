import type { TimelineScale } from "@/hooks/use-timeline-scale"
import { EDITOR_HEIGHT } from "@/lib/timeline/types"

interface EditorAxisProps {
  scale: TimelineScale
  powerMode: "absolute" | "percentage"
}

export function EditorAxis({ scale, powerMode }: EditorAxisProps) {
  return (
    <div className="relative w-10 shrink-0" style={{ height: EDITOR_HEIGHT }}>
      {scale.powerTicks.map((power) => (
        <span
          key={power}
          className="absolute right-1 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums"
          style={{ top: scale.powerToY(power) }}
        >
          {powerMode === "absolute" ? `${power}` : `${power}%`}
        </span>
      ))}
    </div>
  )
}
