import { describeArc } from "../../utils"
import type { MetricPodProps } from "./types"
import { cn } from "@/lib/utils"

const VIEWBOX = 100
const CENTER = VIEWBOX / 2
const RADIUS = 40
const STROKE = 5
/** Ring opening (degrees), facing the text so the dial reads as a gauge. */
const GAP_DEG = 96

/**
 * A side pod for a secondary metric (cadence, heart rate). It is not a hard card
 * — the dial forms a fully-rounded outer end, with the value/label flowing
 * inward over subtle accent shading and a soft top highlight. `side` mirrors the
 * whole thing for the left vs right of the HUD.
 */
export const MetricPod = ({
  label,
  value,
  unit,
  fill,
  color,
  icon: Icon,
  side,
}: MetricPodProps) => {
  const isLeft = side === "left"

  // Ring gap faces the text (inner) side so the dial opens toward the readout.
  const gapCenter = isLeft ? 90 : 270
  const trackStart = gapCenter + GAP_DEG / 2
  const sweep = 360 - GAP_DEG
  const fillEnd = trackStart + Math.max(0, Math.min(1, fill)) * sweep

  const dial = (
    <div className="relative aspect-square h-full shrink-0">
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="h-full w-full overflow-visible"
        aria-hidden
      >
        <path
          d={describeArc(
            CENTER,
            CENTER,
            RADIUS,
            trackStart,
            trackStart + sweep
          )}
          fill="none"
          stroke="rgba(150, 165, 220, 0.16)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        {fill > 0.001 && (
          <path
            d={describeArc(CENTER, CENTER, RADIUS, trackStart, fillEnd)}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${color})` }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon
          className="size-[50%]"
          style={{ color, filter: `drop-shadow(0 0 6px ${color})` }}
          strokeWidth={2.25}
        />
      </div>
    </div>
  )

  const text = (
    <div
      className={cn(
        "flex flex-col justify-center leading-none",
        isLeft ? "items-start pr-8 text-left" : "items-end pl-8 text-right"
      )}
    >
      <span className="font-heading text-xs font-semibold tracking-[0.22em] text-white/55 uppercase">
        {label}
      </span>
      <span className="mt-1 font-heading text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold text-white tabular-nums">
        {value !== null ? Math.round(value) : "--"}
      </span>
      <span className="mt-0.5 font-heading text-sm font-medium tracking-[0.22em] text-white/45 uppercase">
        {unit}
      </span>
    </div>
  )

  // The rim follows the pod's rounded shape, then is masked horizontally so it is
  // solid along the outer (dial) edge and fades to nothing toward the centre —
  // keeping the outer border while losing the inner one.
  const roundedClass = isLeft
    ? "rounded-l-full rounded-r-2xl"
    : "rounded-r-full rounded-l-2xl"
  const rimMask = isLeft
    ? "linear-gradient(90deg, #000 0%, #000 32%, transparent 88%)"
    : "linear-gradient(90deg, transparent 12%, #000 68%, #000 100%)"

  return (
    <div
      className={cn(
        "relative flex h-[clamp(5rem,75vw,8rem)] items-center",
        // The dial side is fully rounded; the inner side is gently rounded.
        isLeft ? "flex-row" : "flex-row-reverse",
        roundedClass
      )}
      style={{
        background: `linear-gradient(${isLeft ? "90deg" : "270deg"}, ${color}26, ${color}0d 45%, transparent 78%)`,
      }}
    >
      <span
        aria-hidden
        className={cn("pointer-events-none absolute inset-0", roundedClass)}
        style={{
          boxShadow: `inset 0 0 0 1px ${color}80`,
          maskImage: rimMask,
          WebkitMaskImage: rimMask,
        }}
      />
      {dial}
      {text}
    </div>
  )
}
