import { SegmentedArc } from "../segmented-arc"
import type { PowerGaugeProps } from "./types"

const SEGMENT_COUNT = 40

/**
 * Central gauge: a zone-coloured segmented power arc wrapping a stacked readout
 * of watts (large) and speed (below a thin neon divider). When power exceeds the
 * 3×FTP full-scale the arc pins full and pulses.
 */
export const PowerGauge = ({
  powerWatts,
  fill,
  color,
  overScale,
  speedValue,
  speedUnit,
}: PowerGaugeProps) => {
  return (
    <div className="relative aspect-square w-[clamp(15rem,26vw,22rem)]">
      <SegmentedArc
        fill={overScale ? 1 : fill}
        segmentCount={SEGMENT_COUNT}
        activeColor={color}
        flash={overScale}
      />

      {/* Centred readout, nudged up to sit within the arc's open bowl. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center leading-none">
          <span
            className="font-heading text-[clamp(2.75rem,6vw,4rem)] font-semibold tracking-tight text-white tabular-nums"
            style={{ textShadow: `0 0 22px ${color}` }}
          >
            {powerWatts !== null ? Math.round(powerWatts) : "--"}
          </span>
          <span className="font-heading text-sm font-medium tracking-[0.3em] text-white/55">
            W
          </span>
        </div>

        <div
          className="my-2 h-px w-2/5"
          style={{
            background: `linear-gradient(to right, transparent, ${color}, transparent)`,
          }}
        />

        <div className="flex items-baseline gap-1.5">
          <span className="font-heading text-[clamp(1.5rem,3.2vw,2.25rem)] font-semibold text-white tabular-nums">
            {speedValue}
          </span>
          <span className="font-heading text-xs font-medium tracking-[0.22em] text-white/55">
            {speedUnit}
          </span>
        </div>
      </div>
    </div>
  )
}
