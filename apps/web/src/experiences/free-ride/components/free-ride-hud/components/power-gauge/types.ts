export type PowerGaugeProps = {
  powerWatts: number | null
  /** Fraction of full-scale (0–1) the arc should fill. */
  fill: number
  /** Zone colour for the lit segments. */
  color: string
  /** True while the target drone draft lock is active. */
  draftLocked: boolean
  /** Current HUD intensity colour, draft colour while locked. */
  intensityColor: string
  /** True when power is over full-scale (arc pinned full + flashing). */
  overScale: boolean
  speedValue: string
  speedUnit: string
}
