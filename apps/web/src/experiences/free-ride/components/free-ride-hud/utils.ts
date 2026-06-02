/**
 * Shared SVG geometry helpers for the Free Ride HUD gauges. Angles are measured
 * in degrees with 0° at the top (12 o'clock) and increasing clockwise, matching
 * SVG's `rotate()` direction so the segmented and smooth arcs stay consistent.
 */

export function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export type Point = { x: number; y: number }

/** Point on a circle for an angle measured clockwise from the top. */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number
): Point {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  }
}

/**
 * SVG path `d` for a circular arc from `startAngle` to `endAngle` (both clockwise
 * from the top). Used for the smooth side-pod arcs.
 */
export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

/**
 * SVG path `d` for an annular sector (a ring wedge) between `innerRadius` and
 * `outerRadius`, from `startAngle` to `endAngle` (clockwise from the top). The
 * straight sides are radial — they point at the centre — so a row of these reads
 * as true gauge segments that converge inward rather than uniform pills.
 */
export function describeAnnularSector(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle)
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle)
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle)
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ")
}
