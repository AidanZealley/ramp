import { FREE_RIDE_TARGETS } from "../../../../free-ride-config"
import { clamp01 } from "../../utils"
import type { WeaponChargeMeterProps } from "./types"

export const WeaponChargeMeter = ({
  charge,
  percent,
  active,
  color,
  segmentCount,
}: WeaponChargeMeterProps) => {
  const safeSegmentCount = Math.max(0, Math.floor(segmentCount))
  const safeCharge = clamp01(charge)
  const filledSegmentCount = Math.round(safeCharge * safeSegmentCount)
  const full = safeCharge >= 1

  return (
    <div
      className={
        active && !full
          ? "font-heading flex min-w-50 flex-col items-center gap-1.5 rounded border border-white/15 bg-black/30 px-3 py-2 shadow-[0_0_18px_rgba(255,207,92,0.28)] backdrop-blur-sm"
          : "font-heading flex min-w-50 flex-col items-center gap-1.5 rounded border border-white/15 bg-black/30 px-3 py-2 backdrop-blur-sm"
      }
      style={{
        color,
        boxShadow: full
          ? `0 0 26px ${color}66`
          : active
            ? `0 0 20px ${color}4d`
            : "0 0 20px rgba(255,255,255,0.08)",
      }}
      data-active={active}
      data-full={full}
    >
      <div className="flex w-full items-baseline justify-between gap-4 text-[0.6rem] font-semibold tracking-[0.18em] uppercase">
        <span>{FREE_RIDE_TARGETS.weaponChargeLabel.toUpperCase()}</span>
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
                  ? "weapon-charge-segment-filled"
                  : "weapon-charge-segment-empty"
              }
              className="h-2 w-2.5 rounded-[1px] sm:w-3.5"
              style={{
                backgroundColor: filled
                  ? color
                  : "rgba(220, 252, 255, 0.16)",
                boxShadow: filled ? `0 0 ${full ? 12 : 9}px ${color}` : undefined,
                opacity: filled ? 1 : 0.74,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
