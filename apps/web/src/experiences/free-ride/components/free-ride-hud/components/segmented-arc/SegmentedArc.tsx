import { useId } from "react"
import { describeAnnularSector } from "../../utils"
import type { SegmentedArcProps } from "./types"

/**
 * A bottom-open arc rendered as a row of true gauge segments — each an annular
 * sector (ring wedge) whose straight sides are radial, so the segments sit
 * closer together at the inner edge and fan apart at the outer edge. Segments
 * fill clockwise from the left up to `fill`. Drawn into a square viewBox; the
 * caller sizes it via CSS.
 */
export const SegmentedArc = ({
  fill,
  segmentCount,
  sweepDeg = 220,
  radius = 120,
  segmentLength = 20,
  gapRatio = 0.32,
  activeColor,
  trackColor = "rgba(120, 140, 200, 0.18)",
  flash = false,
}: SegmentedArcProps) => {
  const glowId = useId()
  const pad = 8
  const cx = radius + pad
  const cy = radius + pad
  const size = (radius + pad) * 2

  const innerRadius = radius - segmentLength
  const startAngle = -sweepDeg / 2
  const slot = sweepDeg / segmentCount
  const gap = slot * gapRatio
  const activeCount = Math.round(fill * segmentCount)

  const segments = Array.from({ length: segmentCount }, (_, i) => {
    const a0 = startAngle + i * slot + gap / 2
    const a1 = startAngle + (i + 1) * slot - gap / 2
    return {
      key: i,
      d: describeAnnularSector(cx, cy, innerRadius, radius, a0, a1),
      isActive: i < activeCount,
    }
  })

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-full w-full overflow-visible"
      aria-hidden
    >
      <defs>
        <filter id={glowId} x="-75%" y="-75%" width="250%" height="250%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {segments.map(({ key, d, isActive }) => (
        <path
          key={key}
          d={d}
          fill={isActive ? activeColor : trackColor}
          filter={isActive ? `url(#${glowId})` : undefined}
          className={isActive && flash ? "free-ride-hud-flash" : undefined}
        />
      ))}
    </svg>
  )
}
