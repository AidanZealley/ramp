import type { HudStatProps } from "./types"

/**
 * Small uppercase-label + large-value block used for the corner read-outs
 * (elapsed time, distance, grade).
 */
export const HudStat = ({ label, value, align = "left", accent }: HudStatProps) => (
  <div className={align === "right" ? "text-right" : "text-left"}>
    <div className="font-heading text-[0.6rem] font-semibold tracking-[0.28em] text-white/50 uppercase">
      {label}
    </div>
    <div
      className="font-heading text-2xl font-semibold text-white tabular-nums sm:text-3xl"
      style={accent ? { textShadow: `0 0 16px ${accent}` } : undefined}
    >
      {value}
    </div>
  </div>
)
