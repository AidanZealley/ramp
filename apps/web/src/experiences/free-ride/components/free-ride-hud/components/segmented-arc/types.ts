export type SegmentedArcProps = {
  /** Fraction of the arc to light up, 0–1. */
  fill: number
  /** Number of discrete segments around the arc. */
  segmentCount: number
  /** Sweep angle in degrees (arc opens at the bottom). */
  sweepDeg?: number
  /** Outer radius of the segment band, in viewBox units. */
  radius?: number
  /** Radial thickness of the segment band (outer radius − inner radius). */
  segmentLength?: number
  /** Fraction (0–1) of each angular slot left as the gap between segments. */
  gapRatio?: number
  /** Colour of lit segments (any CSS colour). */
  activeColor: string
  /** Colour of unlit segments. */
  trackColor?: string
  /** When true, lit segments pulse (used at/over full-scale). */
  flash?: boolean
}
