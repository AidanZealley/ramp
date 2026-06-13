import { FREE_RIDE_TARGETS } from "../../../../free-ride-config"
import { clamp01 } from "../../utils"
import type { DraftQualityMeterProps } from "./types"

export const DraftQualityMeter = ({
  quality,
  percent,
  color,
  segmentCount,
}: DraftQualityMeterProps) => {
  const safeSegmentCount = Math.max(0, Math.floor(segmentCount))
  const filledSegmentCount = Math.round(clamp01(quality) * safeSegmentCount)

  return (
    <div
      className="font-heading flex min-w-46 flex-col items-center gap-1.5 rounded border border-white/15 bg-black/30 px-3 py-2 shadow-[0_0_24px_rgba(92,255,209,0.18)] backdrop-blur-sm"
      style={{ color }}
    >
      <div className="flex w-full items-baseline justify-between gap-4 text-[0.6rem] font-semibold tracking-[0.18em] uppercase">
        <span>{FREE_RIDE_TARGETS.draftQualityLabel}</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: safeSegmentCount }, (_, index) => {
          const filled = index < filledSegmentCount
          return (
            <span
              key={index}
              data-testid={
                filled
                  ? "draft-quality-segment-filled"
                  : "draft-quality-segment-empty"
              }
              className="h-2 w-3 rounded-[1px] sm:w-4"
              style={{
                backgroundColor: filled
                  ? color
                  : "rgba(220, 252, 255, 0.18)",
                boxShadow: filled ? `0 0 10px ${color}` : undefined,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
