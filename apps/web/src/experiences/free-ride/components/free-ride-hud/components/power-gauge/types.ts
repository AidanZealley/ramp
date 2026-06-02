export type PowerGaugeProps = {
  powerWatts: number | null
  /** Fraction of full-scale (0–1) the arc should fill. */
  fill: number
  /** Zone colour for the lit segments. */
  color: string
  /** True when power is over full-scale (arc pinned full + flashing). */
  overScale: boolean
  speedValue: string
  speedUnit: string
}
